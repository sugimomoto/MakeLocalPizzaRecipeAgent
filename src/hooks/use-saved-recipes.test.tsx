/**
 * useSavedRecipes のユニットテスト。
 * Firestore は `@/lib/firebase/saved-recipe` を mock する。
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSavedRecipes } from './use-saved-recipes';

import type { SavedRecipe } from '@/domain/saved-recipe';
import type { Unsubscribe } from 'firebase/firestore';

const subscribeSavedRecipesMock = vi.fn();
vi.mock('@/lib/firebase/saved-recipe', () => ({
  subscribeSavedRecipes: (...args: unknown[]) => subscribeSavedRecipesMock(...args),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseDb: () => ({ __kind: 'fake-db' }),
}));

type AuthState = {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
};
let authState: AuthState = { status: 'loading', user: null };
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ ...authState, signInWithGoogle: vi.fn(), signOut: vi.fn() }),
}));

beforeEach(() => {
  subscribeSavedRecipesMock.mockReset();
  authState = { status: 'loading', user: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildRecipe(candidateId: string, savedAt: Date): SavedRecipe {
  return {
    candidateId,
    title: `r-${candidateId}`,
    localeId: 'miyagi',
    prefecture: '宮城県',
    strategy: 'exploit',
    imageUrl: '',
    savedAt,
  };
}

describe('useSavedRecipes', () => {
  it('starts in loading state with null items', () => {
    authState = { status: 'loading', user: null };
    const { result } = renderHook(() => useSavedRecipes());
    expect(result.current.state).toBe('loading');
    expect(result.current.items).toBeNull();
    expect(subscribeSavedRecipesMock).not.toHaveBeenCalled();
  });

  it('returns unauthenticated state without touching Firestore', () => {
    authState = { status: 'unauthenticated', user: null };
    const { result } = renderHook(() => useSavedRecipes());
    expect(result.current.state).toBe('unauthenticated');
    expect(result.current.items).toBeNull();
    expect(subscribeSavedRecipesMock).not.toHaveBeenCalled();
  });

  it('subscribes once authenticated and reflects the snapshot list', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'K', email: null, photoURL: null },
    };
    let captured: ((items: SavedRecipe[]) => void) | null = null;
    subscribeSavedRecipesMock.mockImplementation((_db, _uid, onChange): Unsubscribe => {
      captured = onChange as (items: SavedRecipe[]) => void;
      return () => {};
    });

    const { result } = renderHook(() => useSavedRecipes());
    expect(subscribeSavedRecipesMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'fake-db' }),
      'u-1',
      expect.any(Function),
      expect.any(Function),
    );

    // 空のレスポンス → state='ready', items=[]
    act(() => captured?.([]));
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.items).toEqual([]);

    // 3 件のレスポンス → そのまま反映 (順序は subscribe 側で orderBy 済み)
    const list = [
      buildRecipe('a', new Date('2026-05-17T10:00:00Z')),
      buildRecipe('b', new Date('2026-05-16T10:00:00Z')),
      buildRecipe('c', new Date('2026-05-15T10:00:00Z')),
    ];
    act(() => captured?.(list));
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items?.map((x) => x.candidateId)).toEqual(['a', 'b', 'c']);
  });

  it('unsubscribes on unmount', () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'K', email: null, photoURL: null },
    };
    const unsubSpy = vi.fn();
    subscribeSavedRecipesMock.mockImplementation((): Unsubscribe => unsubSpy);

    const { unmount } = renderHook(() => useSavedRecipes());
    expect(unsubSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it('captures Firestore subscribe errors into result.error', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'K', email: null, photoURL: null },
    };
    let capturedErr: ((e: Error) => void) | null = null;
    subscribeSavedRecipesMock.mockImplementation((_db, _uid, _onChange, onError): Unsubscribe => {
      capturedErr = onError as (e: Error) => void;
      return () => {};
    });

    const { result } = renderHook(() => useSavedRecipes());
    act(() => capturedErr?.(new Error('permission-denied')));
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'));
  });
});
