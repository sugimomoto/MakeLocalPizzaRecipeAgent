/**
 * subscribeFurusatoItems のテスト。
 *
 * Firestore Web SDK の onSnapshot を mock し、ヘルパが受け取った doc から
 * - 必須フィールド欠落の item を弾く
 * - TTL 切れ doc は空配列を返す
 * - doc 不在は空配列を返す
 * を verify する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribeFurusatoItems } from './furusato';

import type { FurusatoItem } from '@/domain/furusato';
import type * as FirestoreModule from 'firebase/firestore';
import type { DocumentData, DocumentSnapshot, Firestore, Unsubscribe } from 'firebase/firestore';

// firestore SDK を mock — onSnapshot に注入される callback を直接呼ぶ
const onSnapshotMock = vi.fn();
const docMock = vi.fn();

vi.mock('firebase/firestore', async () => {
  const actual = (await vi.importActual('firebase/firestore')) as typeof FirestoreModule;
  return {
    ...actual,
    doc: (...args: unknown[]) => docMock(...args),
    onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  };
});

function makeSnap(exists: boolean, data?: DocumentData): DocumentSnapshot<DocumentData> {
  return {
    exists: () => exists,
    data: () => data ?? ({} as DocumentData),
  } as unknown as DocumentSnapshot<DocumentData>;
}

const fakeDb = { __kind: 'fake-db' } as unknown as Firestore;
const fakeUnsub = vi.fn() as unknown as Unsubscribe;

const SAMPLE_ITEM = {
  itemId: 'shop:1',
  ingredientId: 'miyagi-oyster',
  platform: 'rakuten',
  title: '【ふるさと納税】宮城県松島町 三陸産生牡蠣',
  municipality: '宮城県松島町',
  producer: '松島漁業',
  donationAmount: 12000,
  url: 'https://item.rakuten.co.jp/x',
  affiliateUrl: null,
  imageUrl: 'https://thumb.example.com/x.jpg',
  inStock: true,
  fetchedAt: '2026-05-19T00:00:00.000Z',
};

beforeEach(() => {
  onSnapshotMock.mockReset();
  docMock.mockReset();
  docMock.mockReturnValue({ __kind: 'doc-ref' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('subscribeFurusatoItems', () => {
  it('returns [] when the document does not exist', () => {
    const onChange = vi.fn();
    onSnapshotMock.mockImplementation((_ref, next): Unsubscribe => {
      next(makeSnap(false));
      return fakeUnsub;
    });

    subscribeFurusatoItems(fakeDb, 'miyagi-oyster', onChange);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('returns items when fresh document exists', () => {
    const onChange = vi.fn<(items: FurusatoItem[]) => void>();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now (string)
    onSnapshotMock.mockImplementation((_ref, next): Unsubscribe => {
      next(
        makeSnap(true, {
          ingredientId: 'miyagi-oyster',
          items: [SAMPLE_ITEM],
          refreshedAt: '2026-05-19T00:00:00.000Z',
          ttlExpiresAt: future.toISOString(),
        }),
      );
      return fakeUnsub;
    });

    subscribeFurusatoItems(fakeDb, 'miyagi-oyster', onChange);
    const calls = onChange.mock.calls;
    expect(calls).toHaveLength(1);
    const items = calls[0]?.[0] ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.itemId).toBe('shop:1');
    expect(items[0]?.platform).toBe('rakuten');
  });

  it('returns [] when ttlExpiresAt is in the past', () => {
    const onChange = vi.fn<(items: FurusatoItem[]) => void>();
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    onSnapshotMock.mockImplementation((_ref, next): Unsubscribe => {
      next(
        makeSnap(true, {
          ingredientId: 'miyagi-oyster',
          items: [SAMPLE_ITEM],
          refreshedAt: '2026-04-19T00:00:00.000Z',
          ttlExpiresAt: past.toISOString(),
        }),
      );
      return fakeUnsub;
    });

    subscribeFurusatoItems(fakeDb, 'miyagi-oyster', onChange);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('drops items with missing required fields (itemId / title / url / donationAmount)', () => {
    const onChange = vi.fn<(items: FurusatoItem[]) => void>();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const invalidItem = { ...SAMPLE_ITEM, itemId: '' };
    const itemZeroPrice = { ...SAMPLE_ITEM, itemId: 'shop:2', donationAmount: 0 };
    onSnapshotMock.mockImplementation((_ref, next): Unsubscribe => {
      next(
        makeSnap(true, {
          items: [invalidItem, SAMPLE_ITEM, itemZeroPrice],
          ttlExpiresAt: future.toISOString(),
        }),
      );
      return fakeUnsub;
    });

    subscribeFurusatoItems(fakeDb, 'miyagi-oyster', onChange);
    const items = onChange.mock.calls[0]?.[0] ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.itemId).toBe('shop:1');
  });

  it('propagates errors to onError when provided', () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    onSnapshotMock.mockImplementation((_ref, _next, err): Unsubscribe => {
      err(new Error('permission-denied'));
      return fakeUnsub;
    });

    subscribeFurusatoItems(fakeDb, 'miyagi-oyster', onChange, onError);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'permission-denied' }));
  });

  it('returns the same Unsubscribe that onSnapshot returns', () => {
    onSnapshotMock.mockReturnValue(fakeUnsub);
    const unsub = subscribeFurusatoItems(fakeDb, 'miyagi-oyster', vi.fn());
    expect(unsub).toBe(fakeUnsub);
  });
});
