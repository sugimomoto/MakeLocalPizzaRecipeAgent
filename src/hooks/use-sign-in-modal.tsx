'use client';

/**
 * useSignInModal / SignInModalProvider — グローバルなサインイン Modal の開閉。
 *
 * - openModal() / close() で <SignInModal /> を制御
 * - Provider 配下に <SignInModal /> を 1 つだけ mount するので、各画面のハートや
 *   /library から openModal() を呼ぶだけで統一的なサインイン Modal が出る
 *
 * 配置: <AuthProvider> の内側 (signInWithGoogle が使えるように) かつ
 * <ToastProvider> と同列以上で OK (Modal がトーストを push できれば良い)
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { SignInModal } from '@/components/auth/SignInModal';

export type SignInModalContextValue = {
  isOpen: boolean;
  openModal: () => void;
  close: () => void;
};

const SignInModalContext = createContext<SignInModalContextValue | null>(null);

export function SignInModalProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<SignInModalContextValue>(
    () => ({ isOpen, openModal, close }),
    [isOpen, openModal, close],
  );

  return (
    <SignInModalContext.Provider value={value}>
      {children}
      <SignInModal />
    </SignInModalContext.Provider>
  );
}

export function useSignInModal(): SignInModalContextValue {
  const ctx = useContext(SignInModalContext);
  if (!ctx) {
    throw new Error('useSignInModal must be used within <SignInModalProvider>');
  }
  return ctx;
}
