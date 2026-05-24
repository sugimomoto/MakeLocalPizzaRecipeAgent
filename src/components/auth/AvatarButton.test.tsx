/**
 * AvatarButton (Slice 7 仕様) のテスト:
 * - 3 状態 (loading / unauthenticated / authenticated) の描画分岐
 * - unauthenticated → onClick で useSignInModal.openModal
 * - authenticated → onClick で Dropdown が開く (HeaderDropdown が出現)
 * - Dropdown 内のサインアウト押下で useAuth().signOut() が呼ばれる
 * - photoURL があれば <img>、無ければイニシャル
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarButton } from './AvatarButton';

const pushMock = vi.fn();
const usePathnameMock = vi.fn(() => '/library');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => usePathnameMock(),
}));

const openModalMock = vi.fn();
vi.mock('@/hooks/use-sign-in-modal', () => ({
  useSignInModal: () => ({ isOpen: false, openModal: openModalMock, close: vi.fn() }),
}));

const toastPushMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ push: toastPushMock }),
}));

// useAuth は test ごとに状態を差し替える
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
const signOutMock = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    ...authState,
    signInWithGoogle: vi.fn(),
    signOut: signOutMock,
  }),
}));

beforeEach(() => {
  pushMock.mockReset();
  openModalMock.mockReset();
  signOutMock.mockReset();
  toastPushMock.mockReset();
  usePathnameMock.mockReturnValue('/library');
  authState = { status: 'loading', user: null };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AvatarButton', () => {
  it('loading 時はプレースホルダのみ (button なし)', () => {
    authState = { status: 'loading', user: null };
    const { container } = render(<AvatarButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('unauthenticated 時は「サインイン」リンク、クリックで openModal', async () => {
    authState = { status: 'unauthenticated', user: null };
    const user = userEvent.setup();
    render(<AvatarButton />);

    const link = screen.getByRole('button', { name: 'サインイン' });
    expect(link).toBeInTheDocument();
    await user.click(link);
    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('authenticated 時 (no photoURL) はイニシャル + chevron、クリックで Dropdown 展開', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'Kazu', email: 'kazu@example.com', photoURL: null },
    };
    const user = userEvent.setup();
    render(<AvatarButton />);

    const trigger = screen.getByRole('button', { name: 'ユーザーメニュー' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('K');
    expect(trigger.querySelector('img')).toBeNull();

    // 初期は Dropdown 非表示
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);

    // Dropdown が出現
    const menu = await screen.findByRole('menu', { name: 'ユーザーメニュー' });
    expect(menu).toBeInTheDocument();
    // 3 つの menuitem (library / journal / サインアウト)
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('ピザ帳 (保存)');
    expect(items[1]).toHaveTextContent('振り返り帳 (作った)');
    expect(items[2]).toHaveTextContent('サインアウト');
  });

  it('Dropdown 内「振り返り帳」クリックで router.push("/journal")', async () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'Kazu', email: 'kazu@example.com', photoURL: null },
    };
    const user = userEvent.setup();
    render(<AvatarButton />);

    await user.click(screen.getByRole('button', { name: 'ユーザーメニュー' }));
    const journalItem = await screen.findByRole('menuitem', { name: /振り返り帳/ });
    await user.click(journalItem);

    expect(pushMock).toHaveBeenCalledWith('/journal');
  });

  it('Dropdown 内サインアウトで signOut + info Toast', async () => {
    signOutMock.mockResolvedValueOnce(undefined);
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: 'Kazu', email: 'kazu@example.com', photoURL: null },
    };
    const user = userEvent.setup();
    render(<AvatarButton />);

    await user.click(screen.getByRole('button', { name: 'ユーザーメニュー' }));
    const signOutItem = await screen.findByRole('menuitem', { name: /サインアウト/ });
    await user.click(signOutItem);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(toastPushMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'info', message: 'サインアウトしました。' }),
      );
    });
  });

  it('photoURL があれば <img> を出す', () => {
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

  it('displayName 無 + email 有なら email のローカル部 (大文字) をイニシャルに', () => {
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
    expect(screen.getByRole('button', { name: 'ユーザーメニュー' })).toHaveTextContent('M');
  });

  it('displayName / email 両方 null なら「？」', () => {
    authState = {
      status: 'authenticated',
      user: { uid: 'u-1', displayName: null, email: null, photoURL: null },
    };
    render(<AvatarButton />);
    expect(screen.getByRole('button', { name: 'ユーザーメニュー' })).toHaveTextContent('？');
  });
});
