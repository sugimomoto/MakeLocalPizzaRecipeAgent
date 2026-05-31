/**
 * アプリ層レートリミットのドメイン型 (Slice 9)
 *
 * design.md §2.1 と整合。
 * 詳細: .steering/20260530-slice9-rate-limit/design.md
 */

/** rate-limit が対象とする論理 route の識別子。Firestore doc にも書く。 */
export type RateLimitRouteKey =
  | '/api/quicktap/sessions'
  | '/api/quicktap/sessions/[id]/reroll'
  | '/api/recipes/[candidateId]';

/**
 * rate-limit の判定 key。優先順位: auth > guest > ip > anonymous
 *
 * - `anonymous` はローカル dev / X-Forwarded-For 無 / auth/guest 無の最終フォールバック。
 *   本番では基本的には発生しない (Cloud Run が XFF を必ず付与)。
 *   Memory store では「常に allowed」として扱い、テストノイズを避ける。
 */
export type RateLimitKey =
  | { kind: 'auth'; uid: string }
  | { kind: 'guest'; guestSessionId: string }
  | { kind: 'ip'; ip: string }
  | { kind: 'anonymous' };

/** Store.tryConsume の戻り値。 */
export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/** Store.tryConsume の入力。 */
export type TryConsumeInput = {
  bucket: string;
  key: RateLimitKey;
  routeKey: RateLimitRouteKey;
  limit: number;
  now: Date;
};
