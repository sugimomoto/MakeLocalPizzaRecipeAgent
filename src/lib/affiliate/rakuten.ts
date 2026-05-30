/**
 * 楽天アフィリエイトリンク生成 (Slice 8)
 *
 * - 環境変数 `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` が指定されていれば、
 *   楽天アフィリエイトの汎用形式 `https://hb.afl.rakuten.co.jp/hgc/{id}/?pc={encodedUrl}` を返す
 * - 未指定の環境では素 URL を返す (開発環境・ローカル動作で安全に動くように)
 *
 * 開示: リンクは `rel="sponsored noopener noreferrer"` で開く想定。
 * `requirements.md` FR-8-3 と整合。
 */

const RAKUTEN_AFFILIATE_BASE = 'https://hb.afl.rakuten.co.jp/hgc';

/** 楽天 ENRO 公式店 */
export const ENRO_STORE_URL = 'https://www.rakuten.co.jp/enro/';

/** ENRO 電気釜やきマスター スターターセット (将来 URL 変更時はここを更新) */
export const ENRO_PRODUCT_URL =
  'https://item.rakuten.co.jp/enro/electric-kamayaki-master-starterset/';

function getAffiliateId(): string | null {
  const id = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
  if (typeof id !== 'string' || id.trim().length === 0) return null;
  return id.trim();
}

/**
 * 与えられた楽天系 URL をアフィリエイト形式に変換する。
 * affiliate ID 未設定なら素 URL のまま返す。
 */
export function toAffiliateUrl(rakutenUrl: string): string {
  const id = getAffiliateId();
  if (id === null) return rakutenUrl;
  return `${RAKUTEN_AFFILIATE_BASE}/${id}/?pc=${encodeURIComponent(rakutenUrl)}`;
}

/** ENRO 店舗 TOP へのアフィリエイトリンク */
export function buildEnroStoreUrl(): string {
  return toAffiliateUrl(ENRO_STORE_URL);
}

/** ENRO スターターセット商品ページへのアフィリエイトリンク */
export function buildEnroProductUrl(): string {
  return toAffiliateUrl(ENRO_PRODUCT_URL);
}
