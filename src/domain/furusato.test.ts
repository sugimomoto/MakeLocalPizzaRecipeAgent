/**
 * FurusatoItem 型のスモークテスト。
 *
 * TypeScript の型なので runtime に validate されるものはほぼないが、
 * Python の Pydantic 側 (`test_domain_furusato.py`) と同じ valid payload で
 * 構造的に矛盾していないことを type-level で担保する。
 *
 * 実用的な validation は (a) Firestore からの read 時に `subscribeFurusatoItems`
 * で normalize、(b) refresh CLI が Python 側 `from_rakuten_item` でガード、の
 * 2 段で行われる。
 */
import { describe, expect, it } from 'vitest';

import type { FurusatoItem, FurusatoItemsDoc } from './furusato';

describe('FurusatoItem (type smoke)', () => {
  it('accepts a fully-populated payload', () => {
    const item: FurusatoItem = {
      itemId: 'shop-A:rakuten-item-1',
      ingredientId: 'miyagi-oyster',
      platform: 'rakuten',
      title: '【ふるさと納税】宮城県松島町 三陸産生牡蠣 1kg 殻付き',
      municipality: '宮城県松島町',
      producer: '松島漁業協同組合',
      donationAmount: 12000,
      url: 'https://item.rakuten.co.jp/shop/abc/',
      affiliateUrl: 'https://hb.afl.rakuten.co.jp/...',
      imageUrl: 'https://thumbnail.image.rakuten.co.jp/...',
      inStock: true,
      fetchedAt: '2026-05-19T00:00:00.000Z',
    };
    expect(item.platform).toBe('rakuten');
    expect(item.donationAmount).toBeGreaterThan(0);
  });

  it('allows null for optional fields', () => {
    const item: FurusatoItem = {
      itemId: 'x',
      ingredientId: 'miyagi-oyster',
      platform: 'rakuten',
      title: 't',
      municipality: '宮城県',
      producer: null,
      donationAmount: 5000,
      url: 'https://item.rakuten.co.jp/',
      affiliateUrl: null,
      imageUrl: null,
      inStock: false,
      fetchedAt: '2026-05-19T00:00:00.000Z',
    };
    expect(item.producer).toBeNull();
    expect(item.affiliateUrl).toBeNull();
    expect(item.imageUrl).toBeNull();
    expect(item.inStock).toBe(false);
  });

  it('FurusatoItemsDoc can hold zero or many items', () => {
    const empty: FurusatoItemsDoc = {
      ingredientId: 'miyagi-oyster',
      items: [],
      refreshedAt: '2026-05-19T00:00:00.000Z',
      ttlExpiresAt: '2026-05-26T00:00:00.000Z',
    };
    expect(empty.items).toHaveLength(0);
  });
});
