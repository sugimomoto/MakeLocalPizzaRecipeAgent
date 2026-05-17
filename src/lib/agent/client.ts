/**
 * AgentClient — ピザ候補を生成する Agent への抽象。
 *
 * Slice 1: MockAgentClient (mock-candidates.ts) が実装
 * Slice 2: HttpAgentClient (Python ADK Agent を Cloud Run 経由で呼ぶ) を追加し、
 *          process.env.AGENT_MODE === 'mock' ? MockAgentClient : HttpAgentClient で切替
 *
 * ストリーム返却は ReadableStream<Uint8Array> (NDJSON バイト列)。
 * 受信側は src/lib/agent/stream.ts の decodeNdjsonStream() で StreamEvent に変換。
 */

import type { Candidate } from '@/domain/candidate';
import type { IngredientId } from '@/domain/ingredient';
import type { LocaleId } from '@/domain/locale';

export type GenerateCandidatesInput = {
  localeId: LocaleId;
  ingredients: IngredientId[];
  guestSessionId?: string;
  /** Slice 4 の Firebase Auth 統合で使う。未認証なら省略。 */
  userId?: string;
};

/**
 * Slice 3 で追加: 詳細レシピ + Imagen 画像生成への入力。
 *
 * candidateId は URL path に乗り、candidate snapshot (Slice 2 の 1 案分) は
 * body に乗る。Slice 4 で Firestore に candidate を保存した後は candidateId
 * だけで取り回せるが、Slice 3 ではセッションストレージ経由で client から
 * snapshot を毎回送る。
 */
export type GenerateRecipeDetailInput = {
  candidateId: string;
  localeId: LocaleId;
  ingredients: IngredientId[];
  candidate: Candidate;
  guestSessionId?: string;
  userId?: string;
};

export interface AgentClient {
  generateCandidates(input: GenerateCandidatesInput): Promise<ReadableStream<Uint8Array>>;
  reroll(sessionId: string): Promise<ReadableStream<Uint8Array>>;
  /** Slice 3: 詳細レシピ + Imagen 画像 NDJSON を返す。 */
  generateRecipeDetail(input: GenerateRecipeDetailInput): Promise<ReadableStream<Uint8Array>>;
}
