import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocale } from './use-locale';

import { LOCALE_STORAGE_KEY, writeLocale } from '@/lib/localstorage/locale';

describe('useLocale', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null localeId when nothing has been written', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.localeId).toBeNull();
    expect(result.current.selectedAt).toBeNull();
    expect(result.current.isHydrated).toBe(true); // jsdom 環境では window が存在
  });

  it('reads an existing stored value on first render', () => {
    writeLocale('miyagi', 1736743200000);
    const { result } = renderHook(() => useLocale());
    expect(result.current.localeId).toBe('miyagi');
    expect(result.current.selectedAt).toBe(1736743200000);
  });

  it('setLocale updates the stored value and re-renders the hook', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.localeId).toBeNull();

    act(() => {
      result.current.setLocale('nagano');
    });
    expect(result.current.localeId).toBe('nagano');
  });

  it('clearLocale wipes the value and re-renders to null', () => {
    writeLocale('kochi');
    const { result } = renderHook(() => useLocale());
    expect(result.current.localeId).toBe('kochi');

    act(() => {
      result.current.clearLocale();
    });
    expect(result.current.localeId).toBeNull();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it('two hook instances stay in sync via the internal listener set', () => {
    const a = renderHook(() => useLocale());
    const b = renderHook(() => useLocale());

    act(() => {
      a.result.current.setLocale('miyagi');
    });
    expect(a.result.current.localeId).toBe('miyagi');
    expect(b.result.current.localeId).toBe('miyagi');
  });

  it('responds to cross-tab storage events for LOCALE_STORAGE_KEY', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.localeId).toBeNull();

    act(() => {
      window.localStorage.setItem(
        LOCALE_STORAGE_KEY,
        JSON.stringify({ localeId: 'kochi', selectedAt: 1 }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LOCALE_STORAGE_KEY,
          newValue: window.localStorage.getItem(LOCALE_STORAGE_KEY),
        }),
      );
    });

    expect(result.current.localeId).toBe('kochi');
  });

  it('ignores storage events for unrelated keys', () => {
    writeLocale('miyagi');
    const { result } = renderHook(() => useLocale());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'mlpr.someOtherKey.v1', newValue: 'x' }),
      );
    });

    // 値変更なし
    expect(result.current.localeId).toBe('miyagi');
  });
});
