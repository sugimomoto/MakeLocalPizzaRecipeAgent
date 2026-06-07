/**
 * GA4 イベント送信ヘルパ。
 *
 * 設計方針:
 *   - 本番 (`NODE_ENV === 'production'`) かつ `NEXT_PUBLIC_GA_MEASUREMENT_ID` が
 *     設定されている時のみ送信する。dev / preview では `console.debug` に流して終了。
 *   - DNT (Do Not Track) ヘッダ / navigator.doNotTrack を尊重する。
 *   - SSR / 非ブラウザ環境では何もしない (window が無いだけで早期 return)。
 *   - event 名と params の型は GA4 推奨の snake_case で定義。
 *
 * 利用例:
 *   import { trackEvent } from '@/lib/analytics/track';
 *   trackEvent('view_recipe_detail', { recipe_id: id, prefecture });
 *
 * 失敗は握りつぶす (analytics の落下が UX を壊さないように)。
 */

/** GA4 が受け付ける gtag コマンド最小型。アプリ側では `event` のみ使う。 */
type GtagFn = (command: 'event', eventName: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

/**
 * 計測対象イベント (高優先 6 種 + 拡張余地)。
 *
 * - 命名は GA4 推奨の snake_case。
 * - 既存の GA4 推奨イベント名 (page_view, select_content 等) と衝突しない名前に。
 */
export type TrackEventName =
  | 'generate_candidates' // 候補 3 案生成リクエスト発火 (/local → /ingredients → Tap2)
  | 'select_candidate' // 候補カード選択 (候補一覧 → 詳細画面遷移)
  | 'view_recipe_detail' // 詳細画面 (レシピ全文) 表示
  | 'save_recipe' // ピザ帳に保存
  | 'view_equipment_guide' // /equipment LP 到達
  | 'click_affiliate_link' // 楽天アフィリエイトリンクのクリック
  | 'share_intent' // Slice 10 「X で共有」CTA 押下 → 確認モーダル表示
  | 'share_published' // Slice 10 shareId 発行成功
  | 'share_target' // Slice 10 拡張: シェア先ボタン (X / Facebook / native / copy) のタップ
  | 'share_page_view'; // Slice 10 /share/[shareId] 公開ページ表示

/** GA4 イベントパラメータ。値は string / number / boolean のみ受ける (GA4 仕様)。 */
export type TrackEventParams = Record<string, string | number | boolean | undefined>;

/** DNT 1 / "yes" / "1" の場合に送信を抑止する。 */
function isDoNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ??
    // 一部レガシーブラウザ用 (型定義に無いのでアクセスは any 経由)
    (globalThis as unknown as { doNotTrack?: string }).doNotTrack;
  return dnt === '1' || dnt === 'yes';
}

/**
 * GA4 にイベントを送る。本番以外 / DNT 時は何もしない。
 *
 * 未定義 params の key は GA4 側で混乱しないように除外する。
 */
export function trackEvent(name: TrackEventName, params: TrackEventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') {
    // dev で計測仕込みのデバッグがしやすいよう console には残す。
    // eslint-disable-next-line no-console
    console.debug('[analytics:dev]', name, params);
    return;
  }
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  if (isDoNotTrack()) return;
  if (typeof window.gtag !== 'function') return;

  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) cleaned[k] = v;
  }

  try {
    window.gtag('event', name, cleaned);
  } catch {
    // 計測の失敗で UI を巻き込まない。
  }
}
