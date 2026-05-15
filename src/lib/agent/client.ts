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

import type { IngredientId } from '@/domain/ingredient';
import type { LocaleId } from '@/domain/locale';

export type GenerateCandidatesInput = {
  localeId: LocaleId;
  ingredients: IngredientId[];
  guestSessionId?: string;
  /** Slice 4 の Firebase Auth 統合で使う。未認証なら省略。 */
  userId?: string;
};

export interface AgentClient {
  generateCandidates(input: GenerateCandidatesInput): Promise<ReadableStream<Uint8Array>>;
  reroll(sessionId: string): Promise<ReadableStream<Uint8Array>>;
}
