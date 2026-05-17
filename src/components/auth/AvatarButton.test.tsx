/**
 * AvatarButton のテスト:
 * - 3 状態 (loading / unauthenticated / authenticated) の描画分岐
 * - unauthenticated → onClick で useSignInModal.openModal が呼ばれる
 * - authenticated → onClick で router.push('/library') が呼ばれる
 * - photoURL があれば <img>、無ければイニシャル
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarButton } from './AvatarButton';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const openModalMock = vi.fn();
vi.mock('@/hooks/use-sign-in-modal', () => ({
  useSignInModal: () => ({ isOpen: false, openModal: openModalMock, close: vi.fn() }),
}));

// useAuth は test ごとに状態を差し替えたいので let で持つ
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
  pushMock.mockReset();
  openModalMock.mockReset();
  authState = { status: 'loading', user: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AvatarButton', () => {
  it('renders an aria-hidden placeholder while status is loading', () => {
    authState = { status: 'loading', user: null };
    const { container } = render(<AvatarButton />);
    // button は出ない
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // 何かしらの要素は描画されている (レイアウト保持)
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a "サインイン" link when unauthenticated', async () => {
    authState = { status: 'unauthenticated', user: null };
    const user = userEvent.setup();
    render(<AvatarButton />);

    const link = screen.getByRole('button', { name: 'サインイン' });
    expect(link).toBeInTheDocument();
    await user.click(link);
    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('renders initials avatar when authenticated without photoURL', async () => {
    authState = {
      status: 'authenticated',
      user: {
        uid: 'u-1',
        displayName: 'Kazu',
        email: 'kazu@example.com',
        photoURL: null,
      },
    };
    const user = userEvent.setup();
    render(<AvatarButton />);

    const btn = screen.getByRole('button', { name: /Kazu のピザ帳を開く/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('K');
    expect(btn.querySelector('img')).toBeNull();

    await user.click(btn);
    expect(pushMock).toHaveBeenCalledWith('/library');
  });

  it('renders an <img> when photoURL is provided', () => {
    authState = {
      status: 'authenticated',
      user: {
        uid: 'u-1',
        displayName: 'Kazu',
        email: 'kazu@example.com',
        photoURL: 'https://example.com/me.png',
      },
    };
    const { container } = render(<AvatarButton />);

    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/me.png');
  });

  it('falls back to the email local-part when displayName is null', () => {
    authState = {
      status: 'authenticated',
      user: {
        uid: 'u-1',
        displayName: null,
        email: 'matsushima@example.com',
        photoURL: null,
      },
    };
    render(<AvatarButton />);
    // aria-label には email が入る
    const btn = screen.getByRole('button', { name: /matsushima@example.com/ });
    expect(btn).toHaveTextContent('M');
  });

  it('falls back to "？" when neither displayName nor email is available', () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: null, email: null, photoURL: null },
    };
    render(<AvatarButton />);
    expect(screen.getByRole('button')).toHaveTextContent('？');
  });
});
