/**
 * useSavedRecipe のユニットテスト。
 *
 * Firestore 本体ではなく `@/lib/firebase/saved-recipe` のヘルパを mock し、
 * フック内のロジック (auth status → state 遷移 / save/unsave 呼び出し) を検証する。
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSavedRecipe } from './use-saved-recipe';

import type { SavedRecipe, SavedRecipeSnapshot } from '@/domain/saved-recipe';
import type { Unsubscribe } from 'firebase/firestore';

const subscribeSavedRecipeMock = vi.fn();
const saveRecipeMock = vi.fn();
const unsaveRecipeMock = vi.fn();

vi.mock('@/lib/firebase/saved-recipe', () => ({
  subscribeSavedRecipe: (...args: unknown[]) => subscribeSavedRecipeMock(...args),
  saveRecipe: (...args: unknown[]) => saveRecipeMock(...args),
  unsaveRecipe: (...args: unknown[]) => unsaveRecipeMock(...args),
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
  useAuth: () => ({
    ...authState,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

beforeEach(() => {
  subscribeSavedRecipeMock.mockReset();
  saveRecipeMock.mockReset();
  unsaveRecipeMock.mockReset();
  authState = { status: 'loading', user: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SAMPLE_SNAPSHOT: SavedRecipeSnapshot = {
  candidateId: 'cand-1',
  title: '松島牡蠣の春',
  localeId: 'miyagi',
  prefecture: '宮城県',
  strategy: 'exploit',
  imageUrl: 'https://example.com/r/cand-1.png',
};

describe('useSavedRecipe', () => {
  it('starts in "loading" state while auth status is loading', () => {
    authState = { status: 'loading', user: null };
    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    expect(result.current.state).toBe('loading');
    expect(result.current.recipe).toBeNull();
    expect(subscribeSavedRecipeMock).not.toHaveBeenCalled();
  });

  it('transitions to "unauthenticated" without touching Firestore', () => {
    authState = { status: 'unauthenticated', user: null };
    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    expect(result.current.state).toBe('unauthenticated');
    expect(subscribeSavedRecipeMock).not.toHaveBeenCalled();
  });

  it('subscribes to the Firestore doc once authenticated and reflects snap callbacks', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'K', email: 'k@x', photoURL: null },
    };
    let captured: ((next: SavedRecipe | null) => void) | null = null;
    subscribeSavedRecipeMock.mockImplementation((_db, _uid, _cid, onChange): Unsubscribe => {
      captured = onChange as (next: SavedRecipe | null) => void;
      return () => {};
    });

    const { result } = renderHook(() => useSavedRecipe('cand-1'));

    // 初期は loading のまま onSnapshot 待ち
    expect(subscribeSavedRecipeMock).toHaveBeenCalledTimes(1);
    expect(subscribeSavedRecipeMock.mock.calls[0]?.[1]).toBe('u-1');
    expect(subscribeSavedRecipeMock.mock.calls[0]?.[2]).toBe('cand-1');

    // doc 不在 → unsaved
    act(() => captured?.(null));
    await waitFor(() => expect(result.current.state).toBe('unsaved'));
    expect(result.current.recipe).toBeNull();

    // doc 存在 → saved
    const saved: SavedRecipe = { ...SAMPLE_SNAPSHOT, savedAt: new Date('2026-05-17T00:00:00Z') };
    act(() => captured?.(saved));
    await waitFor(() => expect(result.current.state).toBe('saved'));
    expect(result.current.recipe).toEqual(saved);
  });

  it('unsubscribes when the consumer unmounts', () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'K', email: null, photoURL: null },
    };
    const unsubSpy = vi.fn();
    subscribeSavedRecipeMock.mockImplementation((): Unsubscribe => unsubSpy);

    const { unmount } = renderHook(() => useSavedRecipe('cand-1'));
    expect(unsubSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it('save() forwards the snapshot to saveRecipe with the current uid', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: null, email: null, photoURL: null },
    };
    subscribeSavedRecipeMock.mockImplementation((): Unsubscribe => () => {});
    saveRecipeMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    await act(async () => {
      await result.current.save(SAMPLE_SNAPSHOT);
    });
    expect(saveRecipeMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'fake-db' }),
      'u-1',
      SAMPLE_SNAPSHOT,
    );
  });

  it('unsave() calls unsaveRecipe with uid + candidateId', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: null, email: null, photoURL: null },
    };
    subscribeSavedRecipeMock.mockImplementation((): Unsubscribe => () => {});
    unsaveRecipeMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    await act(async () => {
      await result.current.unsave();
    });
    expect(unsaveRecipeMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'fake-db' }),
      'u-1',
      'cand-1',
    );
  });

  it('save() throws when not authenticated', async () => {
    authState = { status: 'unauthenticated', user: null };
    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    await expect(result.current.save(SAMPLE_SNAPSHOT)).rejects.toThrow(/not authenticated/);
  });

  it('captures Firestore errors into result.error', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: null, email: null, photoURL: null },
    };
    let capturedErr: ((e: Error) => void) | null = null;
    subscribeSavedRecipeMock.mockImplementation(
      (_db, _uid, _cid, _onChange, onError): Unsubscribe => {
        capturedErr = onError as (e: Error) => void;
        return () => {};
      },
    );

    const { result } = renderHook(() => useSavedRecipe('cand-1'));
    act(() => capturedErr?.(new Error('permission-denied')));
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'));
  });
});
