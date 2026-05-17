/**
 * useSignInModal / SignInModalProvider のテスト。
 *
 * SignInModal 本体は <dialog> + Auth/Toast Context 依存があるので、ここでは
 * SignInModal を vi.mock で stub し、Provider の open/close 制御だけ検証する。
 * Modal 内部の挙動 (Google ボタン → signInWithGoogle / ESC で close) は
 * 別途 SignInModal.test.tsx で検証する。
 */
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SignInModalProvider, useSignInModal } from './use-sign-in-modal';

import type { ReactNode } from 'react';

vi.mock('@/components/auth/SignInModal', () => ({
  SignInModal: () => {
    const { isOpen } = useSignInModal();
    return <div data-testid="signin-modal-stub" data-open={isOpen ? '1' : '0'} />;
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <SignInModalProvider>{children}</SignInModalProvider>;
}

describe('useSignInModal', () => {
  it('starts closed', () => {
    render(
      <SignInModalProvider>
        <div />
      </SignInModalProvider>,
    );
    expect(screen.getByTestId('signin-modal-stub')).toHaveAttribute('data-open', '0');
  });

  it('openModal() flips the state to open', () => {
    const { result } = renderHook(() => useSignInModal(), { wrapper });
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(true);
  });

  it('close() flips back to closed', () => {
    const { result } = renderHook(() => useSignInModal(), { wrapper });
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('renders exactly one <SignInModal /> regardless of consumers', () => {
    render(
      <SignInModalProvider>
        <span />
      </SignInModalProvider>,
    );
    expect(screen.getAllByTestId('signin-modal-stub')).toHaveLength(1);
  });

  it('throws when used outside of <SignInModalProvider>', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSignInModal())).toThrowError(
      /must be used within <SignInModalProvider>/,
    );
    consoleErrorSpy.mockRestore();
  });
});
