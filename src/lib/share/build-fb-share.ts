/**
 * Facebook Share Dialog URL builder — Slice 10 拡張
 *
 * https://www.facebook.com/sharer/sharer.php?u=<URL>
 * - App ID 不要・即利用可能
 * - 共有時の文言は Facebook 側のフォームで編集 (= URL の OGP からプレビュー)
 * - URL を URLEncode してクエリに渡すだけ
 */
export function buildFacebookShareUrl(shareUrl: string): string {
  const params = new URLSearchParams({ u: shareUrl });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}
