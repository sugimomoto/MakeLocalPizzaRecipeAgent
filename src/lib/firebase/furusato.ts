/**
 * Firestore `furusato_items/{ingredientId}` の read-only ヘルパ (Slice 5)。
 *
 * 設計:
 * - Web SDK は **read のみ**。書き込みは Python refresh CLI が Admin SDK 経由で行う
 *   (Security Rules が public read / client write 不可で保護済)。
 * - ドキュメントには `items: FurusatoItem[]` と `ttlExpiresAt` (Timestamp) が
 *   入っており、`ttlExpiresAt < now` ならアプリ側で expired と判定する。
 * - 未認証でも read 可 (商品情報は公開データ)。
 */
import {
  doc,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import type { FurusatoItem } from '@/domain/furusato';

export const FURUSATO_ITEMS_COLLECTION = 'furusato_items';

function furusatoItemsDocRef(db: Firestore, ingredientId: string) {
  return doc(db, FURUSATO_ITEMS_COLLECTION, ingredientId);
}

/** Firestore Timestamp / Date / ISO 文字列を Date に正規化 */
function toDate(raw: unknown): Date | null {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** 1 item の最小バリデーション + 型 narrowing */
function normalizeItem(raw: unknown, ingredientId: string): FurusatoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const itemId = typeof o['itemId'] === 'string' ? o['itemId'] : '';
  const title = typeof o['title'] === 'string' ? o['title'] : '';
  const url = typeof o['url'] === 'string' ? o['url'] : '';
  const donationAmount = typeof o['donationAmount'] === 'number' ? o['donationAmount'] : 0;
  // 必須フィールドが欠落していたら弾く
  if (!itemId || !title || !url || donationAmount <= 0) return null;
  return {
    itemId,
    ingredientId: typeof o['ingredientId'] === 'string' ? o['ingredientId'] : ingredientId,
    platform: 'rakuten',
    title,
    municipality: typeof o['municipality'] === 'string' ? o['municipality'] : '',
    producer: typeof o['producer'] === 'string' ? o['producer'] : null,
    donationAmount,
    url,
    affiliateUrl: typeof o['affiliateUrl'] === 'string' ? o['affiliateUrl'] : null,
    imageUrl: typeof o['imageUrl'] === 'string' ? o['imageUrl'] : null,
    inStock: typeof o['inStock'] === 'boolean' ? o['inStock'] : true,
    fetchedAt: typeof o['fetchedAt'] === 'string' ? o['fetchedAt'] : '',
  };
}

/**
 * `furusato_items/{ingredientId}` を購読する。
 *
 * 返却挙動:
 * - doc が無い → `onChange([])` (cache 未走の食材)
 * - TTL 切れ → `onChange([])` (アプリ側評価で silently skip)
 * - 正常 → `onChange(items)` (items 配列をそのまま渡す)
 *
 * 並列に N 個の `subscribeFurusatoItems` を張ることを想定 (useFurusatoItems で flatten)。
 */
export function subscribeFurusatoItems(
  db: Firestore,
  ingredientId: string,
  onChange: (items: FurusatoItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = furusatoItemsDocRef(db, ingredientId);
  return onSnapshot(
    ref,
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) {
        onChange([]);
        return;
      }
      const data = snap.data();
      // TTL 切れチェック
      const ttl = toDate(data['ttlExpiresAt']);
      if (ttl !== null && ttl < new Date()) {
        onChange([]);
        return;
      }
      const itemsRaw = Array.isArray(data['items']) ? data['items'] : [];
      const items: FurusatoItem[] = [];
      for (const raw of itemsRaw) {
        const it = normalizeItem(raw, ingredientId);
        if (it) items.push(it);
      }
      onChange(items);
    },
    (error) => onError?.(error),
  );
}
