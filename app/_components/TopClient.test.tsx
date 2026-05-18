/**
 * TopClient のテスト:
 * 1. hydration 前は何も描画しない
 * 2. リピーター (localeId 有) は /local に redirect
 * 3. 初回訪問者は TOP の本文を描画
 * 4. 「始める →」で /local に push
 * 5. 「サインインしてピザ帳を開く」で openModal()
 * 6. localeId 無 + authenticated になったら /library に redirect
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TopClient } from './TopClient';

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

const openModalMock = vi.fn();
vi.mock('@/hooks/use-sign-in-modal', () => ({
  useSignInModal: () => ({ isOpen: false, openModal: openModalMock, close: vi.fn() }),
}));

type LocaleState = { localeId: string | null; isHydrated: boolean };
let localeState: LocaleState = { localeId: null, isHydrated: false };
vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({
    ...localeState,
    selectedAt: null,
    setLocale: vi.fn(),
    clearLocale: vi.fn(),
  }),
}));

type AuthState = { status: 'loading' | 'unauthenticated' | 'authenticated' };
let authState: AuthState = { status: 'unauthenticated' };
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    ...authState,
    user: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

beforeEach(() => {
  replaceMock.mockReset();
  pushMock.mockReset();
  openModalMock.mockReset();
  localeState = { localeId: null, isHydrated: false };
  authState = { status: 'unauthenticated' };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TopClient', () => {
  it('renders nothing before hydration', () => {
    localeState = { localeId: null, isHydrated: false };
    const { container } = render(<TopClient />);
    expect(container.firstChild).toBeNull();
  });

  it('redirects to /local when localeId is already saved (returning visitor)', () => {
    localeState = { localeId: 'miyagi', isHydrated: true };
    render(<TopClient />);
    expect(replaceMock).toHaveBeenCalledWith('/local');
  });

  it('renders the TOP content for a first-time visitor (no localeId)', () => {
    localeState = { localeId: null, isHydrated: true };
    render(<TopClient />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /未来の一枚は、あなたの地元にある。/,
    );
    expect(screen.getByRole('button', { name: /始める/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'サインインしてピザ帳を開く' })).toBeInTheDocument();
  });

  it('「始める」 pushes to /local', async () => {
    const user = userEvent.setup();
    localeState = { localeId: null, isHydrated: true };
    render(<TopClient />);
    await user.click(screen.getByRole('button', { name: /始める/ }));
    expect(pushMock).toHaveBeenCalledWith('/local');
  });

  it('「サインインしてピザ帳を開く」 invokes openModal', async () => {
    const user = userEvent.setup();
    localeState = { localeId: null, isHydrated: true };
    render(<TopClient />);
    await user.click(screen.getByRole('button', { name: 'サインインしてピザ帳を開く' }));
    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('redirects to /library once authenticated (no localeId)', () => {
    localeState = { localeId: null, isHydrated: true };
    authState = { status: 'authenticated' };
    render(<TopClient />);
    expect(replaceMock).toHaveBeenCalledWith('/library');
  });
});
