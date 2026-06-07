/**
 * Share (Slice 10) — 共有レシピのドメイン型 + 入出力スキーマ
 *
 * - Server-side で受信した body の検証は Zod を使う (既存 API と同じパターン)。
 * - `SharedRecipeSnapshot` は Firestore `shared_recipes/{shareId}` の doc 形状。
 * - 取り消し機能は本スライスでは対象外 (永続発行)。`ownerUid` / `ownerGuestSessionId`
 *   フィールドは将来の取消機能や所有者通知のため最初から持つ。
 */
import { z } from 'zod';

/** タイトル / story.headline 等の表示用テキストを X 投稿テンプレに収めるための切り詰め。 */
export const SHARE_TITLE_MAX = 80;
export const SHARE_HEADLINE_MAX = 160;
export const SHARE_BODY_MAX = 1200;

/** Zod schema — client が `POST /api/share` に送る body。 */
export const ShareRequestSchema = z.object({
  candidateId: z.string().min(1).max(80),
  title: z.string().min(1).max(SHARE_TITLE_MAX),
  concept: z.string().max(SHARE_HEADLINE_MAX),
  story: z.object({
    eyebrow: z.string().max(80).default(''),
    headline: z.string().max(SHARE_HEADLINE_MAX),
    body: z.string().max(SHARE_BODY_MAX),
  }),
  meta: z.object({
    servings: z.string().max(40),
    duration: z.string().max(40),
    bakingTemp: z.string().max(40),
    difficulty: z.string().max(40),
  }),
  materials: z
    .array(
      z.object({
        name: z.string().max(80),
        quantity: z.string().max(80),
      }),
    )
    .max(30),
  steps: z.array(z.string().max(400)).max(20),
  imageUrl: z.string().url(),
  prefecture: z.string().max(40),
  strategy: z.enum(['exploit', 'tune', 'explore']),
  localeId: z.string().max(80),
  /**
   * Tap2 で選択した食材 ID 配列 (例: `["miyagi-oyster", "miyagi-seri"]`)。
   * 公開ページ側の `FurusatoSection` がこれを購読してふるさと納税返礼品を出す。
   * 既存共有 (ingredients を持たない旧 doc) は read 時に空配列で hydrate される。
   */
  ingredients: z.array(z.string().max(80)).max(20).default([]),
});

export type ShareRequest = z.infer<typeof ShareRequestSchema>;

/** Firestore `shared_recipes/{shareId}` の doc 形状 (server-side)。 */
export type SharedRecipeSnapshot = ShareRequest & {
  shareId: string;
  ownerUid: string | null;
  ownerGuestSessionId: string | null;
  sharedAt: Date;
};

/** API レスポンス。 */
export type ShareResponse = {
  shareId: string;
  url: string;
};

/**
 * `share_index/{indexKey}` の doc id を組み立てる。
 * 「同じ owner + candidateId」での再共有時に既存 shareId を返すべき等性に使う。
 *
 * 現在は ownerScope は常に `'guest'` (auth uid を server 側で抽出する経路が未整備のため)。
 * 将来 uid 抽出が入ったら `'auth'` も使う想定。
 */
export function buildShareIndexKey(
  ownerScope: 'guest' | 'auth',
  ownerId: string,
  candidateId: string,
): string {
  // Firestore doc id は `/` を含めないので、可逆な区切り `__` を使う。
  // candidateId は既に `c_2_xxxxxx` 等の英数字想定、ownerId は guest_<uuid> 形式。
  return `${ownerScope}__${ownerId}__${candidateId}`;
}
