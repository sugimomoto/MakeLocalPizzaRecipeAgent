/**
 * useAuth / AuthProvider のユニットテスト。
 *
 * Firebase Auth 本体ではなく、Provider が:
 * 1. 初期状態が 'loading'
 * 2. onAuthStateChanged callback で 'authenticated' / 'unauthenticated' に遷移
 * 3. signInWithGoogle → signInWithPopup が呼ばれる
 * 4. signOut → fbSignOut が呼ばれる
 * を満たすかを検証する。
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './use-auth';

import type { Auth, User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import type { ReactNode } from 'react';

const onAuthStateChangedMock = vi.fn();
const signInWithPopupMock = vi.fn();
const fbSignOutMock = vi.fn();
const googleAuthProviderCtor = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
  signOut: (...args: unknown[]) => fbSignOutMock(...args),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: object) {
    googleAuthProviderCtor();
    Object.assign(this, { providerId: 'google.com' });
  }),
}));

// 本来 getFirebaseAuth() は内部で initializeApp を呼ぶが、テストでは authOverride で
// fake Auth を流し込むため、こちらの mock は呼ばれない想定。安全のため空オブジェクトを返す。
vi.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: () => ({ __kind: 'real-auth' }) as unknown as Auth,
}));

const fakeAuth = { __kind: 'fake-auth' } as unknown as Auth;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider authOverride={fakeAuth}>{children}</AuthProvider>;
}

beforeEach(() => {
  onAuthStateChangedMock.mockReset();
  signInWithPopupMock.mockReset();
  fbSignOutMock.mockReset();
  googleAuthProviderCtor.mockReset();
});

describe('useAuth', () => {
  it('starts in "loading" state before any auth callback fires', () => {
    onAuthStateChangedMock.mockImplementation((): Unsubscribe => () => {});
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();
  });

  it('transitions to "unauthenticated" when onAuthStateChanged returns null', async () => {
    let captured: ((u: FirebaseUser | null) => void) | null = null;
    onAuthStateChangedMock.mockImplementation((_auth, cb): Unsubscribe => {
      captured = cb;
      return () => {};
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      captured?.(null);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('unauthenticated');
    });
    expect(result.current.user).toBeNull();
  });

  it('transitions to "authenticated" and maps the user when onAuthStateChanged returns a user', async () => {
    let captured: ((u: FirebaseUser | null) => void) | null = null;
    onAuthStateChangedMock.mockImplementation((_auth, cb): Unsubscribe => {
      captured = cb;
      return () => {};
    });

    const fbUser = {
      uid: 'u-1',
      displayName: 'Kazu',
      email: 'kazu@example.com',
      photoURL: 'https://example.com/avatar.png',
    } as FirebaseUser;

    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      captured?.(fbUser);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('authenticated');
    });
    expect(result.current.user).toEqual({
      uid: 'u-1',
      displayName: 'Kazu',
      email: 'kazu@example.com',
      photoURL: 'https://example.com/avatar.png',
    });
  });

  it('signInWithGoogle invokes signInWithPopup with the auth instance and a GoogleAuthProvider', async () => {
    onAuthStateChangedMock.mockImplementation((): Unsubscribe => () => {});
    signInWithPopupMock.mockResolvedValue({ user: { uid: 'u-2' } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(signInWithPopupMock).toHaveBeenCalledTimes(1);
    expect(signInWithPopupMock.mock.calls[0]?.[0]).toBe(fakeAuth);
    expect(googleAuthProviderCtor).toHaveBeenCalledTimes(1);
  });

  it('signOut invokes Firebase signOut with the auth instance', async () => {
    onAuthStateChangedMock.mockImplementation((): Unsubscribe => () => {});
    fbSignOutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });

    expect(fbSignOutMock).toHaveBeenCalledWith(fakeAuth);
  });

  it('unsubscribes the auth listener when the provider unmounts', () => {
    const unsubSpy = vi.fn();
    onAuthStateChangedMock.mockImplementation((): Unsubscribe => unsubSpy);

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    expect(unsubSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it('throws a helpful error when used outside of <AuthProvider>', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrowError(/must be used within <AuthProvider>/);
    consoleErrorSpy.mockRestore();
  });
});
