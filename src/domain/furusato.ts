/**
 * FurusatoItem — 楽天ふるさと納税 1 件分の snapshot (Slice 5)。
 *
 * `furusato_items/{ingredientId}` ドキュメントの `items[]` の要素として保存される。
 *
 * 設計判断:
 * - 楽天 IchibaItem/Search API の生レスポンスを Python `normalize.from_rakuten_item`
 *   で射影した「アプリ視点に閉じた」shape。楽天 API の仕様変更からは隔離する。
 * - `platform: 'rakuten'` を持たせて、将来別 EC との並列を許容
 *   (Slice 5 では rakuten 固定)。
 * - `fetchedAt` は ISO 8601 文字列。Firestore Timestamp ではなく Python から
 *   Cloud Logging に流す形式に合わせる。UI 表示時に Date 化することはない (寄付額
 *   の鮮度は TTL で表現するため)。
 */

export type FurusatoItem = {
  /** 楽天 itemCode (refresh 時に取得した一意 ID) */
  itemId: string;
  /** 紐づく ingredient id (Firestore document の親キーと同じ) */
  ingredientId: string;
  /** 拡張余地のため (Slice 5 では 'rakuten' 固定) */
  platform: 'rakuten';
  /** 商品タイトル (例: "【ふるさと納税】宮城県松島町 三陸産生牡蠣...") */
  title: string;
  /** 自治体名 (例: "宮城県松島町") — normalize.py で title から regex 抽出 */
  municipality: string;
  /** 生産者 / 提供事業者 (任意) */
  producer: string | null;
  /** 寄付額 (円、>0) */
  donationAmount: number;
  /** 楽天 itemUrl */
  url: string;
  /** 楽天 affiliateUrl (任意。RAKUTEN_AFFILIATE_ID 指定時に refresh が埋める) */
  affiliateUrl: string | null;
  /** medium image URL (任意) */
  imageUrl: string | null;
  /** 在庫あり (`true`) / 在庫切れの可能性 (`false`) */
  inStock: boolean;
  /** refresh 時に楽天 API から取得した時刻 (ISO 8601) */
  fetchedAt: string;
};

/**
 * Firestore `furusato_items/{ingredientId}` ドキュメントの shape。
 * - `refreshedAt` / `ttlExpiresAt` は Firestore Timestamp として保存され、
 *   Web SDK では `Timestamp` 型、Admin SDK では `firestore.Timestamp` で返る。
 * - クライアント側で `ttlExpiresAt < now` なら expired と判定し、UI に出さない。
 */
export type FurusatoItemsDoc = {
  ingredientId: string;
  items: FurusatoItem[];
  /** ISO 8601 (Firestore Timestamp から `.toDate().toISOString()` で正規化済) */
  refreshedAt: string;
  /** ISO 8601 — refreshedAt + 7 日 */
  ttlExpiresAt: string;
};
