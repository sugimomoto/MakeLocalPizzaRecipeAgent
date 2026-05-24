'use client';

/**
 * AvatarButton — 各画面右上のサインイン入口 / メニュー入口 (Slice 7 改修)
 *
 * Slice 4: クリックで /library に直接遷移していた。
 * Slice 7: クリックで HeaderDropdown を開閉するトリガに変身。
 *   - 未サインイン → 「サインイン」テキストリンク (popup 起動) — 変化なし
 *   - サインイン済 → Avatar + chevron、クリックで Dropdown 開閉
 *     Dropdown 内: 📔 ピザ帳 / 📓 振り返り帳 / サインアウト
 */

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { HeaderDropdown } from '@/components/shell/HeaderDropdown';
import { useAuth } from '@/hooks/use-auth';
import { useHeaderDropdown } from '@/hooks/use-header-dropdown';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';

import styles from './AvatarButton.module.css';

import type { JSX } from 'react';

export type AvatarButtonProps = {
  className?: string;
  size?: number;
};

function getInitials(displayName: string | null, email: string | null): string {
  const name = (displayName ?? '').trim();
  if (name.length > 0) return name.slice(0, 1).toUpperCase();
  const local = (email ?? '').split('@')[0] ?? '';
  if (local.length > 0) return local.slice(0, 1).toUpperCase();
  return '？';
}

function ChevronVertical({ open }: { open: boolean }): JSX.Element {
  const path = open ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6';
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AvatarButton({ className, size = 32 }: AvatarButtonProps): JSX.Element {
  const { status, user, signOut } = useAuth();
  const { openModal } = useSignInModal();
  const toast = useToast();
  const pathname = usePathname();
  const { open, toggle, close, triggerProps, menuProps } = useHeaderDropdown();

  const initials = useMemo(
    () => getInitials(user?.displayName ?? null, user?.email ?? null),
    [user?.displayName, user?.email],
  );

  // SSR / hydration 中はプレースホルダ (レイアウトはキープ)
  if (status === 'loading') {
    return (
      <span
        className={`${styles.placeholder} ${className ?? ''}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  if (status === 'unauthenticated') {
    return (
      <button
        type="button"
        className={`${styles.signInLink} ${className ?? ''}`.trim()}
        onClick={openModal}
      >
        サインイン
      </button>
    );
  }

  // authenticated
  const sizeStyle = { width: size, height: size, borderRadius: size };
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      toast.push({ kind: 'info', message: 'サインアウトしました。' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'サインアウトに失敗しました';
      toast.push({ kind: 'warning', message });
    }
  };

  return (
    <span className={`${styles.dropdownAnchor} ${className ?? ''}`.trim()}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="ユーザーメニュー"
        onClick={toggle}
        {...triggerProps}
      >
        <span
          className={styles.avatar}
          style={sizeStyle}
          aria-hidden
          // Avatar 本体は別 div で囲っているため、当該 div には pointer-events=none
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className={styles.image}
              referrerPolicy="no-referrer"
              draggable={false}
            />
          ) : (
            <span className={styles.initials} style={{ fontSize: size * 0.45 }}>
              {initials}
            </span>
          )}
        </span>
        <span className={styles.chevron}>
          <ChevronVertical open={open} />
        </span>
      </button>

      {open && user ? (
        <HeaderDropdown
          {...menuProps}
          user={{
            initials,
            photoURL: user.photoURL ?? null,
            displayName: user.displayName ?? user.email ?? '',
            email: user.email ?? '',
          }}
          currentRoute={pathname ?? undefined}
          onSelect={close}
          onSignOut={handleSignOut}
        />
      ) : null}
    </span>
  );
}
