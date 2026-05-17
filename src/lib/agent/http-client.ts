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
 */

import type { AgentClient, GenerateCandidatesInput } from './client';

export type HttpAgentClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  /** reroll で同送する localeId/ingredients を保持する内部 cache。
   *  Slice 2: 同一プロセス内 in-memory map で OK (cloud run multi-instance では Slice 4 で
   *  Firestore に上げる前提)。 */
  rerollContextCache?: Map<string, { localeId: string; ingredients: string[] }>;
};

const DEFAULT_TIMEOUT_MS = 60_000;

export class HttpAgentClient implements AgentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly rerollContext: Map<string, { localeId: string; ingredients: string[] }>;

  constructor(options: HttpAgentClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.rerollContext = options.rerollContextCache ?? new Map();
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

  async reroll(sourceSessionId: string): Promise<ReadableStream<Uint8Array>> {
    const ctx = this.rerollContext.get(sourceSessionId);
    if (!ctx) {
      throw new Error(
        `HttpAgentClient.reroll: no context cached for sessionId=${sourceSessionId}. ` +
          `generateCandidates must be called first within the same process.`,
      );
    }
    const newSessionId = await this.generateRandomSessionId();
    // 新 sessionId にもコンテキストを引き継ぐ (連続 reroll 対応)
    this.rerollContext.set(newSessionId, ctx);

    return this.postNdjson('/agent/reroll', {
      sourceSessionId,
      sessionId: newSessionId,
      localeId: ctx.localeId,
      ingredients: ctx.ingredients,
    });
  }

  private async postNdjson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Agent HTTP ${res.status} at ${path}`);
    }
    return res.body;
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
