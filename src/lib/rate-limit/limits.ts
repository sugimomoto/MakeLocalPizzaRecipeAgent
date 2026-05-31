/**
 * route 毎の rate-limit 数値 (Slice 9)
 *
 * 1 ファイルに集約することで、限度値の調整時はここだけ書き換えればよい。
 * 設計根拠: design.md §5.3 / requirements.md §3.2
 *
 * 「個人ホストが 1 セッションで詳細 3 件 + reroll 2 回 = 5 件」を目安に設定。
 */

import type { RateLimitRouteKey } from './types';

export const RATE_LIMITS: Record<RateLimitRouteKey, number> = {
  // 候補 3 案生成: Gemini Flash × 3 ≒ $0.003/req → 10/h で最大 $0.03/h
  '/api/quicktap/sessions': 10,
  // reroll: 候補と同コスト
  '/api/quicktap/sessions/[id]/reroll': 10,
  // 詳細生成: Gemini Flash + Imagen 1 枚 ≒ $0.04/req → 5/h で最大 $0.20/h
  // Imagen が高コストのため最も厳しめに絞る
  '/api/recipes/[candidateId]': 5,
};

/** rate-limit のウィンドウ秒数 (= hour bucket の長さ)。 */
export const LIMIT_WINDOW_SECONDS = 3600;
