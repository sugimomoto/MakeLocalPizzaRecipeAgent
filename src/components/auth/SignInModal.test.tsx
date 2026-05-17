/**
 * SignInModal の挙動テスト:
 * 1. 初期は <dialog> が closed
 * 2. useSignInModal.openModal() で showModal() が呼ばれる
 * 3. Google ボタン押下 → signInWithGoogle() → close & info Toast push
 * 4. signInWithGoogle 失敗 → warning Toast push (popup-closed-by-user は無音)
 * 5. 「やめる」リンクで close()
 *
 * jsdom は <dialog> の showModal を実装していないので、HTMLDialogElement の
 * prototype に stub を挿入する。
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/hooks/use-auth';
import { SignInModalProvider, useSignInModal } from '@/hooks/use-sign-in-modal';
import { ToastProvider } from '@/hooks/use-toast';

import type { Auth, User as FirebaseUser, Unsubscribe } from 'firebase/auth';

const onAuthStateChangedMock = vi.fn();
const signInWithPopupMock = vi.fn();
const fbSignOutMock = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
  signOut: (...args: unknown[]) => fbSignOutMock(...args),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: object) {
    Object.assign(this, { providerId: 'google.com' });
  }),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseAuth: () => ({ __kind: 'fake' }) as unknown as Auth,
}));

beforeEach(() => {
  onAuthStateChangedMock.mockReset();
  signInWithPopupMock.mockReset();
  // 未サインイン状態を作る (cb を即時呼んで null を渡す)
  onAuthStateChangedMock.mockImplementation((_auth, cb): Unsubscribe => {
    cb(null as unknown as FirebaseUser);
    return () => {};
  });

  // jsdom には <dialog> の showModal/close が未実装なので最低限の stub を貼る
  if (!HTMLDialogElement.prototype.showModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
  }
  if (!HTMLDialogElement.prototype.close) {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

function ModalOpener() {
  const { openModal } = useSignInModal();
  return (
    <button type="button" onClick={openModal}>
      OPEN_MODAL
    </button>
  );
}

function harness() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <SignInModalProvider>
          <ModalOpener />
        </SignInModalProvider>
      </ToastProvider>
    </AuthProvider>,
  );
}

describe('SignInModal', () => {
  it('renders into the document but is closed by default', () => {
    harness();
    const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
    expect(dialog).toBeInTheDocument();
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('opens the dialog when openModal() is invoked', async () => {
    const user = userEvent.setup();
    harness();
    await user.click(screen.getByRole('button', { name: 'OPEN_MODAL' }));
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(screen.getByRole('heading', { name: '一枚を、ピザ帳に。' })).toBeInTheDocument();
  });

  it('clicking the Google button calls signInWithPopup, closes the dialog, and pushes an info toast', async () => {
    const user = userEvent.setup();
    signInWithPopupMock.mockResolvedValue({ user: { uid: 'u-1' } });

    harness();
    await user.click(screen.getByRole('button', { name: 'OPEN_MODAL' }));
    await user.click(screen.getByRole('button', { name: /Google で続ける/ }));

    expect(signInWithPopupMock).toHaveBeenCalledTimes(1);
    // dialog が close 済み
    const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(false);
    // info toast が push されている
    expect(await screen.findByRole('status')).toHaveTextContent(/サインインしました/);
  });

  it('clicking 「やめる」 closes the dialog without calling signInWithPopup', async () => {
    const user = userEvent.setup();
    harness();
    await user.click(screen.getByRole('button', { name: 'OPEN_MODAL' }));

    await user.click(screen.getByRole('button', { name: 'やめる' }));
    const dialog = screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(signInWithPopupMock).not.toHaveBeenCalled();
  });

  it('shows a warning toast when signInWithGoogle throws (non popup-closed error)', async () => {
    const user = userEvent.setup();
    signInWithPopupMock.mockRejectedValue(new Error('auth/network-request-failed'));

    harness();
    await user.click(screen.getByRole('button', { name: 'OPEN_MODAL' }));
    await user.click(screen.getByRole('button', { name: /Google で続ける/ }));

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent(/再度お試しください/);
    expect(toast).toHaveTextContent('⚠');
  });

  it('does NOT show a warning toast for popup-closed-by-user errors', async () => {
    const user = userEvent.setup();
    signInWithPopupMock.mockRejectedValue(new Error('auth/popup-closed-by-user'));

    harness();
    await user.click(screen.getByRole('button', { name: 'OPEN_MODAL' }));
    await user.click(screen.getByRole('button', { name: /Google で続ける/ }));

    // 0 を確認するため少し待つ
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
