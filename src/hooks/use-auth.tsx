'use client';

/**
 * useAuth / AuthProvider — Firebase Auth の状態を React Context で全画面に提供する。
 *
 * - `status`: 'loading' → 'authenticated' | 'unauthenticated' に遷移
 * - SSR では常に 'loading' (hydration mismatch を避けるため)
 * - hydration 後に onAuthStateChanged を購読 → 実状態に切替
 * - signInWithGoogle / signOut は popup ベース (Firebase 標準)
 *
 * Slice 4 のサインインプロバイダは Google のみ (設計判断 1.2 参照)。
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseUser(u: FirebaseUser): AuthUser {
  return {
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

/** test 用: Auth インスタンスを差し替えるためのフック (本番では getFirebaseAuth() を使う) */
export type AuthProviderProps = {
  children: ReactNode;
  authOverride?: Auth;
};

export function AuthProvider({ children, authOverride }: AuthProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    // Firebase の env が空の環境 (CI の E2E 等) で初期化が throw しても
    // アプリ全体を落とさないように、未認証状態として静かに fall through する。
    let auth: Auth;
    try {
      auth = authOverride ?? getFirebaseAuth();
    } catch {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      setUser(mapFirebaseUser(fbUser));
      setStatus('authenticated');
    });
    return unsub;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [authOverride]);

  const signInWithGoogle = useCallback(async () => {
    const auth = authOverride ?? getFirebaseAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, [authOverride]);

  const signOut = useCallback(async () => {
    const auth = authOverride ?? getFirebaseAuth();
    await fbSignOut(auth);
  }, [authOverride]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signInWithGoogle, signOut }),
    [status, user, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
