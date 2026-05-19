/**
 * useFurusatoItems のテスト。
 *
 * subscribeFurusatoItems を mock して、フックの state 遷移と flatten / sort を
 * verify する。Firestore 本体には触らない。
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFurusatoItems } from './use-furusato-items';

import type { FurusatoItem } from '@/domain/furusato';
import type { Unsubscribe } from 'firebase/firestore';

const subscribeFurusatoItemsMock = vi.fn();
vi.mock('@/lib/firebase/furusato', () => ({
  subscribeFurusatoItems: (...args: unknown[]) => subscribeFurusatoItemsMock(...args),
}));
vi.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: () => ({ __kind: 'fake-db' }),
}));

const ORIG_ENV = { ...process.env };

function makeItem(itemId: string, ingredientId: string, donationAmount: number): FurusatoItem {
  return {
    itemId,
    ingredientId,
    platform: 'rakuten',
    title: `t-${itemId}`,
    municipality: '宮城県',
    producer: null,
    donationAmount,
    url: 'https://item.rakuten.co.jp/x',
    affiliateUrl: null,
    imageUrl: null,
    inStock: true,
    fetchedAt: '2026-05-19T00:00:00.000Z',
  };
}

beforeEach(() => {
  subscribeFurusatoItemsMock.mockReset();
  process.env.NEXT_PUBLIC_FURUSATO_INTEGRATION = 'on';
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIG_ENV);
  vi.restoreAllMocks();
});

describe('useFurusatoItems', () => {
  it('returns disabled state when env is not "on"', () => {
    process.env.NEXT_PUBLIC_FURUSATO_INTEGRATION = 'off';
    const { result } = renderHook(() => useFurusatoItems(['miyagi-oyster']));
    expect(result.current.state).toBe('disabled');
    expect(result.current.items).toEqual([]);
    expect(subscribeFurusatoItemsMock).not.toHaveBeenCalled();
  });

  it('returns ready+empty immediately for empty ingredientIds', () => {
    const { result } = renderHook(() => useFurusatoItems([]));
    expect(result.current.state).toBe('ready');
    expect(result.current.items).toEqual([]);
    expect(subscribeFurusatoItemsMock).not.toHaveBeenCalled();
  });

  it('starts in loading state until all subscriptions deliver first snapshot', async () => {
    const captured = new Map<string, (items: FurusatoItem[]) => void>();
    subscribeFurusatoItemsMock.mockImplementation((_db, id, onChange): Unsubscribe => {
      captured.set(id, onChange);
      return () => {};
    });

    const { result } = renderHook(() => useFurusatoItems(['miyagi-oyster', 'miyagi-seri']));

    expect(result.current.state).toBe('loading');

    // 1 つ目の snapshot
    act(() => captured.get('miyagi-oyster')?.([makeItem('a', 'miyagi-oyster', 12000)]));
    expect(result.current.state).toBe('loading');
    // 2 つ目の snapshot
    act(() => captured.get('miyagi-seri')?.([makeItem('b', 'miyagi-seri', 8000)]));

    await waitFor(() => expect(result.current.state).toBe('ready'));
  });

  it('flattens items from multiple ingredients and sorts by donationAmount asc', async () => {
    const captured = new Map<string, (items: FurusatoItem[]) => void>();
    subscribeFurusatoItemsMock.mockImplementation((_db, id, onChange): Unsubscribe => {
      captured.set(id, onChange);
      return () => {};
    });

    const { result } = renderHook(() => useFurusatoItems(['x', 'y']));

    act(() => captured.get('x')?.([makeItem('x1', 'x', 12000), makeItem('x2', 'x', 5000)]));
    act(() => captured.get('y')?.([makeItem('y1', 'y', 8000)]));

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.items.map((i) => i.itemId)).toEqual(['x2', 'y1', 'x1']);
  });

  it('captures errors into result.error', async () => {
    let errCb: ((e: Error) => void) | null = null;
    subscribeFurusatoItemsMock.mockImplementation((_db, _id, onChange, onError): Unsubscribe => {
      // 即座に空の snapshot で ready にしておく
      onChange([]);
      errCb = onError as (e: Error) => void;
      return () => {};
    });
    const { result } = renderHook(() => useFurusatoItems(['x']));
    await waitFor(() => expect(result.current.state).toBe('ready'));

    act(() => errCb?.(new Error('permission-denied')));
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'));
  });

  it('unsubscribes all when unmounted', () => {
    const unsubs = [vi.fn(), vi.fn()];
    let i = 0;
    subscribeFurusatoItemsMock.mockImplementation((): Unsubscribe => unsubs[i++]!);

    const { unmount } = renderHook(() => useFurusatoItems(['a', 'b']));
    for (const u of unsubs) expect(u).not.toHaveBeenCalled();
    unmount();
    for (const u of unsubs) expect(u).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when ingredientIds change', () => {
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    subscribeFurusatoItemsMock
      .mockImplementationOnce((): Unsubscribe => unsub1)
      .mockImplementationOnce((): Unsubscribe => unsub2);

    const { rerender } = renderHook(({ ids }: { ids: string[] }) => useFurusatoItems(ids), {
      initialProps: { ids: ['a'] },
    });
    expect(subscribeFurusatoItemsMock).toHaveBeenCalledTimes(1);

    rerender({ ids: ['b'] });
    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(subscribeFurusatoItemsMock).toHaveBeenCalledTimes(2);
  });
});
