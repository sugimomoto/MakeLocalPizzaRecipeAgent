/**
 * 429 受信時の Toast 文言ヘルパ (Slice 9)
 *
 * Retry-After ヘッダの秒数を「あと約 X 分」に変換し、route 種別ごとに
 * 適した警告文を返す。
 */

import type { RateLimitRouteKey } from './types';

const ROUTE_LABEL: Record<RateLimitRouteKey, string> = {
  '/api/quicktap/sessions': '候補生成',
  '/api/quicktap/sessions/[id]/reroll': '振り直し',
  '/api/recipes/[candidateId]': '詳細生成',
  '/api/share': '共有 URL の発行',
};

/**
 * fetch Response が 429 のとき、Toast 用メッセージを組み立てる。
 *
 * 例: 「混雑しています。あと約 23 分後にお試しください。」
 */
export function buildRateLimitToastMessage(res: Response, routeKey: RateLimitRouteKey): string {
  const retryAfterRaw = res.headers.get('retry-after');
  const seconds = retryAfterRaw ? Number(retryAfterRaw) : 60;
  const minutes = Math.max(1, Math.ceil(Number.isFinite(seconds) ? seconds : 60) / 60);
  const minutesInt = Math.ceil(minutes);
  const label = ROUTE_LABEL[routeKey];
  return `${label}の上限に達しました。あと約 ${minutesInt} 分後にお試しください。`;
}
