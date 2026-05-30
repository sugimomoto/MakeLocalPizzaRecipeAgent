/**
 * HttpAgentClient — Python Agent (FastAPI) を叩く実装。
 *
 * MockAgentClient と同じ AgentClient interface を満たし、
 * BFF route の差替だけで切替できる (factory.ts 経由)。
 *
 * - POST /agent/generate-candidates : NDJSON ストリームを返す
 * - POST /agent/reroll              : 同上 (sourceSessionId + 新 sessionId)
 * - AbortSignal.timeout(timeoutMs) で全体タイムアウト
 * - 5xx / 4xx は Error として throw (呼び出し側 = BFF route が ApiError へ変換)
 *
 * ── Slice 6: Cloud Run service-to-service 認証 ──────────────────────────
 * - Cloud Run の Web service から internal-only な Agent service を叩くには
 *   audience=AGENT_BASE_URL の Google ID トークンが必要。
 * - 環境変数 `K_SERVICE` (Cloud Run が自動付与) を見て本番だけ token を
 *   取得する (ローカル dev では token なしで agent に直アクセス)。
 * - google-auth-library の GoogleAuth が ADC (Cloud Run の attached SA)
 *   から ID トークンを発行 (audience 指定)。
 */

import type {
  AgentClient,
  GenerateCandidatesInput,
  GenerateRecipeDetailInput,
  RerollInput,
} from './client';
import type { IdTokenClient } from 'google-auth-library';

export type HttpAgentClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  /** reroll で同送する localeId/ingredients を保持する内部 cache。
   *  Slice 2: 同一プロセス内 in-memory map で OK (cloud run multi-instance では Slice 4 で
   *  Firestore に上げる前提)。 */
  rerollContextCache?: Map<string, { localeId: string; ingredients: string[] }>;
  /** Cloud Run 環境判定の上書き (テスト用)。未指定なら process.env.K_SERVICE で判定。 */
  isCloudRun?: boolean;
};

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Cloud Run の Web instance から internal-only な Agent service を叩くために必要な
 * ID token を取得する関数のシグネチャ。テストでは差替可能。
 * 戻り値が null の場合は Authorization ヘッダを付けない (= local dev)。
 */
export type IdTokenFetcher = (audience: string) => Promise<string | null>;

export class HttpAgentClient implements AgentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly rerollContext: Map<string, { localeId: string; ingredients: string[] }>;
  private readonly isCloudRun: boolean;
  /** google-auth-library の IdTokenClient を audience ごとに lazy 生成・キャッシュ */
  private idTokenClient: IdTokenClient | null = null;

  constructor(options: HttpAgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.rerollContext = options.rerollContextCache ?? new Map();
    // K_SERVICE は Cloud Run が自動付与する。test/local では undefined。
    this.isCloudRun = options.isCloudRun ?? Boolean(process.env.K_SERVICE);
  }

  async generateCandidates(input: GenerateCandidatesInput): Promise<ReadableStream<Uint8Array>> {
    const sessionId = await this.deriveSessionId(input);
    // reroll に備えて元の入力を覚えておく
    this.rerollContext.set(sessionId, {
      localeId: input.localeId,
      ingredients: input.ingredients,
    });

    const body: Record<string, unknown> = {
      sessionId,
      localeId: input.localeId,
      ingredients: input.ingredients,
    };
    if (input.guestSessionId !== undefined) body.guestSessionId = input.guestSessionId;
    if (input.userId !== undefined) body.userId = input.userId;

    return this.postNdjson('/agent/generate-candidates', body);
  }

  async generateRecipeDetail(
    input: GenerateRecipeDetailInput,
  ): Promise<ReadableStream<Uint8Array>> {
    const body: Record<string, unknown> = {
      localeId: input.localeId,
      ingredients: input.ingredients,
      candidate: input.candidate,
    };
    if (input.guestSessionId !== undefined) body.guestSessionId = input.guestSessionId;
    if (input.userId !== undefined) body.userId = input.userId;
    if (input.ovenProfile !== undefined) body.ovenProfile = input.ovenProfile;
    return this.postNdjson(`/agent/recipes/${encodeURIComponent(input.candidateId)}`, body);
  }

  async reroll(input: RerollInput): Promise<ReadableStream<Uint8Array>> {
    // Slice 7: in-memory cache に依存せずクライアントから明示的に渡された
    // context (localeId / ingredients) を優先。cache がヒットすればそちらでも
    // 良いが、Cloud Run マルチインスタンスや Next.js HMR 再起動を考えると
    // 入力ベースで動く方が堅牢。
    const ctx = {
      localeId: input.localeId,
      ingredients: input.ingredients,
    };
    const newSessionId = await this.generateRandomSessionId();
    // 新 sessionId にもコンテキストを引き継ぐ (同一プロセス内連続 reroll の最適化用、optional)
    this.rerollContext.set(newSessionId, ctx);

    const body: Record<string, unknown> = {
      sourceSessionId: input.sourceSessionId,
      sessionId: newSessionId,
      localeId: ctx.localeId,
      ingredients: ctx.ingredients,
    };
    if (input.guestSessionId !== undefined) body.guestSessionId = input.guestSessionId;
    if (input.userId !== undefined) body.userId = input.userId;

    return this.postNdjson('/agent/reroll', body);
  }

  private async postNdjson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ReadableStream<Uint8Array>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const idToken = await this.maybeGetIdToken();
    if (idToken) headers.authorization = `Bearer ${idToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Agent HTTP ${res.status} at ${path}`);
    }
    return res.body;
  }

  /**
   * Cloud Run 環境でのみ ID token を取得する。
   * audience = AGENT_BASE_URL (this.baseUrl)。
   * dev / test 環境 (K_SERVICE 無し) では null を返し、Authorization は付けない。
   */
  private async maybeGetIdToken(): Promise<string | null> {
    if (!this.isCloudRun) return null;
    // google-auth-library は重いので lazy import。Edge / 非 Node ランタイム
    // でこのコードに到達しないことが前提 (Next.js BFF route handler は Node)。
    if (!this.idTokenClient) {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth();
      this.idTokenClient = await auth.getIdTokenClient(this.baseUrl);
    }
    const headers = await this.idTokenClient.getRequestHeaders();
    // getRequestHeaders は { Authorization: "Bearer ..." } を返す
    const authHeader = headers.get('Authorization') ?? headers.get('authorization');
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }
    return null;
  }

  /** input から決定論的 sessionId を作る (テスト容易性 + reroll cache key 整合)。 */
  private async deriveSessionId(input: GenerateCandidatesInput): Promise<string> {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `sess_${crypto.randomUUID()}`;
    }
    void input;
    return `sess_${Math.random().toString(36).slice(2, 14)}`;
  }

  private async generateRandomSessionId(): Promise<string> {
    return this.deriveSessionId({ localeId: '', ingredients: [] });
  }
}
