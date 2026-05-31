/**
 * hour bucket / doc ID / retry-after の計算ヘルパ (Slice 9)
 *
 * UTC で 1 時間単位の bucket を作り、bucket 境界を跨いだ瞬間にカウンタが
 * 自動的にリセットされる仕様 (design.md §1.2 / requirements.md §4.4)。
 */

import type { RateLimitKey, RateLimitRouteKey } from './types';

/** route_key → Firestore doc ID 用の短縮表記 */
const ROUTE_SHORT: Record<RateLimitRouteKey, string> = {
  '/api/quicktap/sessions': 'qt-sessions',
  '/api/quicktap/sessions/[id]/reroll': 'qt-reroll',
  '/api/recipes/[candidateId]': 'recipes',
};

/**
 * 与えられた時刻の hour bucket 文字列 `YYYYMMDDHH` (UTC) を返す。
 *
 * 例: 2026-05-30T15:34:00Z → "2026053015"
 */
export function hourBucket(now: Date): string {
  const y = now.getUTCFullYear().toString().padStart(4, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = now.getUTCDate().toString().padStart(2, '0');
  const h = now.getUTCHours().toString().padStart(2, '0');
  return `${y}${m}${d}${h}`;
}

/**
 * 与えられた時刻から「次の UTC hour 境界まで何秒か」を返す (Retry-After に使う)。
 * 境界跨ぎ直後でも 1 秒以上を返すよう Math.ceil で切上げ + 最低 1 秒保証。
 */
export function secondsUntilNextHour(now: Date): number {
  const next = new Date(now);
  next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  const diff = Math.ceil((next.getTime() - now.getTime()) / 1000);
  return Math.max(1, diff);
}

/**
 * RateLimitKey から「Firestore に書き込む実値」を返す。
 * anonymous は識別子なしのため空文字 (anonymous は Memory store 側で
 * special-case するため Firestore に書かれることは想定しない)。
 */
export function keyValueOf(key: RateLimitKey): string {
  switch (key.kind) {
    case 'auth':
      return key.uid;
    case 'guest':
      return key.guestSessionId;
    case 'ip':
      return key.ip;
    case 'anonymous':
      return '';
  }
}

/**
 * Firestore doc ID を組み立てる。
 *
 * フォーマット: `${bucket}_${keyKind}_${sanitized_keyValue}_${routeShort}`
 *
 * keyValue にスラッシュやドット等の Firestore 禁止文字が混入する可能性
 * (IP のドットは OK だが念のためサニタイズ) を考慮し、`/` と
 * `__` だけ予防的に escape する。
 */
export function buildDocId(bucket: string, key: RateLimitKey, routeKey: RateLimitRouteKey): string {
  const value = keyValueOf(key).replace(/\//g, '-').replace(/__/g, '_-');
  const short = ROUTE_SHORT[routeKey];
  return `${bucket}_${key.kind}_${value}_${short}`;
}
