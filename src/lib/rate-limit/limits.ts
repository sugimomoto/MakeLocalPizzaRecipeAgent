/**
 * route 毎の rate-limit 設定 (Slice 9 / Slice 9.1 refactor)
 *
 * 1 ファイルに集約することで、限度値の調整時はここだけ書き換えればよい。
 * route handler 側は `RATE_LIMIT_CONFIG['/api/...']` を展開するだけで
 * `withRateLimit` に渡せる (limit と routeKey の二重指定が不要)。
 *
 * 設計根拠: design.md §5.3 / requirements.md §3.2
 *
 * 「個人ホストが 1 セッションで詳細 3 件 + reroll 2 回 = 5 件」を目安に設定。
 */

import type { RateLimitRouteKey } from './types';

/** {@link withRateLimit} に渡す設定の主要 2 フィールド (limit + routeKey) */
export type RateLimitConfigEntry = {
  limit: number;
  routeKey: RateLimitRouteKey;
};

/**
 * route 単位のレートリミット設定。
 * route handler 側で `withRateLimit(RATE_LIMIT_CONFIG['/api/...'], handler)` の
 * ように **1 行で展開**できる。
 */
export const RATE_LIMIT_CONFIG: Record<RateLimitRouteKey, RateLimitConfigEntry> = {
  // 候補 3 案生成: Gemini Flash × 3 ≒ $0.003/req → 10/h で最大 $0.03/h
  '/api/quicktap/sessions': {
    limit: 10,
    routeKey: '/api/quicktap/sessions',
  },
  // reroll: 候補と同コスト
  '/api/quicktap/sessions/[id]/reroll': {
    limit: 10,
    routeKey: '/api/quicktap/sessions/[id]/reroll',
  },
  // 詳細生成: Gemini Flash + Imagen 1 枚 ≒ $0.04/req → 5/h で最大 $0.20/h
  // Imagen が高コストのため最も厳しめに絞る
  '/api/recipes/[candidateId]': {
    limit: 5,
    routeKey: '/api/recipes/[candidateId]',
  },
};

/**
 * @deprecated Slice 9.1 で `RATE_LIMIT_CONFIG` に統合。後方互換のため残置。
 * 新規コードは `RATE_LIMIT_CONFIG['/api/...'].limit` を使う。
 */
export const RATE_LIMITS: Record<RateLimitRouteKey, number> = Object.fromEntries(
  Object.entries(RATE_LIMIT_CONFIG).map(([k, v]) => [k, v.limit]),
) as Record<RateLimitRouteKey, number>;

/** rate-limit のウィンドウ秒数 (= hour bucket の長さ)。 */
export const LIMIT_WINDOW_SECONDS = 3600;
