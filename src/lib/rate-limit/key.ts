/**
 * Request + AuthSubject から RateLimitKey を決定する (Slice 9)
 *
 * 優先順位 (design.md §1.1):
 *   1. auth:{uid}            — Firebase Auth 認証済
 *   2. guest:{guestSessionId} — `x-mlpr-guest-session-id` ヘッダあり (= withAuthOptional 解決済)
 *   3. ip:{xff_first}        — X-Forwarded-For の先頭 IP (Cloud Run が付与)
 *   4. anonymous             — 上記すべて無い (ローカル dev でしか発生しない想定)
 */

import type { RateLimitKey } from './types';
import type { AuthSubject } from '@/lib/http/with-auth';

/**
 * X-Forwarded-For ヘッダの先頭 IP を抽出する。
 * Cloud Run / Google Front End 経由なら先頭が original client IP として信頼可能。
 *
 * - ヘッダ無し: null
 * - 空文字: null
 * - "1.2.3.4, 10.0.0.1" → "1.2.3.4"
 */
export function extractIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return null;
  const first = xff.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/**
 * 認証種別とリクエストヘッダから rate-limit 用 key を解決する。
 *
 * 「auth uid を持っていれば authn を最優先で使う」のは、認証済ユーザは
 * 「私という個人」をまたいで一意であり、IP 共有 (NAT 配下) や localStorage
 * クリアの影響を受けないため。
 */
export function resolveRateLimitKey(request: Request, subject: AuthSubject): RateLimitKey {
  // Slice 4-7 時点では AuthSubject は guest / anonymous のみ。
  // 将来 auth が追加されたら 'auth' 分岐を有効化する (現状は到達不能)。
  if (subject.kind === 'guest') {
    return { kind: 'guest', guestSessionId: subject.guestSessionId };
  }
  const ip = extractIp(request);
  if (ip !== null) {
    return { kind: 'ip', ip };
  }
  return { kind: 'anonymous' };
}
