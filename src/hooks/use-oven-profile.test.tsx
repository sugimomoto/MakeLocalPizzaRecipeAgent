import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_OVEN_PROFILE_ID } from '@/domain/oven-profile';
import { OVEN_PROFILE_STORAGE_KEY, writeOvenProfile } from '@/lib/localstorage/oven-profile';

import { useOvenProfile } from './use-oven-profile';

describe('useOvenProfile', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns DEFAULT (enro) when nothing has been written', () => {
    const { result } = renderHook(() => useOvenProfile());
    expect(result.current.profileId).toBe(DEFAULT_OVEN_PROFILE_ID);
    expect(result.current.profileId).toBe('enro_450c_90s');
    expect(result.current.profile.jp).toBe('ENRO 電気ピザ窯');
    expect(result.current.selectedAt).toBeNull();
    expect(result.current.isHydrated).toBe(true);
  });

  it('reads an existing stored value on first render', () => {
    writeOvenProfile('home_oven_280c_10m', 1736743200000);
    const { result } = renderHook(() => useOvenProfile());
    expect(result.current.profileId).toBe('home_oven_280c_10m');
    expect(result.current.profile.jp).toBe('家庭用オーブン');
    expect(result.current.selectedAt).toBe(1736743200000);
  });

  it('setProfile updates the stored value and re-renders', () => {
    const { result } = renderHook(() => useOvenProfile());
    expect(result.current.profileId).toBe('enro_450c_90s');

    act(() => {
      result.current.setProfile('home_oven_280c_10m');
    });
    expect(result.current.profileId).toBe('home_oven_280c_10m');
    expect(result.current.profile.tempLine).toBe('250〜300°C');
  });

  it('two hook instances stay in sync', () => {
    const a = renderHook(() => useOvenProfile());
    const b = renderHook(() => useOvenProfile());

    act(() => {
      a.result.current.setProfile('home_oven_280c_10m');
    });
    expect(a.result.current.profileId).toBe('home_oven_280c_10m');
    expect(b.result.current.profileId).toBe('home_oven_280c_10m');
  });

  it('responds to cross-tab storage events for OVEN_PROFILE_STORAGE_KEY', () => {
    const { result } = renderHook(() => useOvenProfile());
    expect(result.current.profileId).toBe('enro_450c_90s');

    act(() => {
      window.localStorage.setItem(
        OVEN_PROFILE_STORAGE_KEY,
        JSON.stringify({ id: 'home_oven_280c_10m', selectedAt: 1 }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: OVEN_PROFILE_STORAGE_KEY,
          newValue: window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY),
        }),
      );
    });

    expect(result.current.profileId).toBe('home_oven_280c_10m');
  });

  it('ignores storage events for unrelated keys', () => {
    writeOvenProfile('home_oven_280c_10m');
    const { result } = renderHook(() => useOvenProfile());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'mlpr.someOtherKey.v1', newValue: 'x' }),
      );
    });

    expect(result.current.profileId).toBe('home_oven_280c_10m');
  });
});
