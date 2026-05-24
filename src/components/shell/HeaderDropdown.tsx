'use client';

/**
 * HeaderDropdown — AvatarButton 配下のメニュー (Slice 7)
 *
 * 設計: design/slice7-screens.jsx HeaderDropdown @ L96
 *
 * 構造:
 *   ユーザ情報行 (Avatar + name + email)
 *   ──────────────
 *   📔 ピザ帳 (保存)  → /library
 *   ──────────────
 *   📓 振り返り帳 (作った) → /journal
 *   ──────────────
 *   ↪ サインアウト (muted)
 *
 * 現在ルートに朱の縦バー + 薄塗りで強調。
 * a11y は親の useHeaderDropdown が role="menu" + ↑↓ Esc を捌く。
 */

import { useRouter } from 'next/navigation';
import { forwardRef } from 'react';

import styles from './HeaderDropdown.module.css';

import type { JSX, RefObject } from 'react';

export type HeaderDropdownUser = {
  initials: string;
  /** photoURL があれば優先表示 */
  photoURL?: string | null;
  displayName: string;
  email: string;
};

export type HeaderDropdownProps = {
  user: HeaderDropdownUser;
  /** 現在の pathname (active 強調用) */
  currentRoute?: string;
  /** メニュー項目選択時に呼ばれる (親が close + side-effect) */
  onSelect?: () => void;
  /** サインアウト押下 */
  onSignOut: () => void;
  /** menuProps from useHeaderDropdown */
  role: 'menu';
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
};

type Item = {
  id: string;
  icon: string;
  jp: string;
  en: string;
  route: '/library' | '/journal';
};

const ITEMS: Item[] = [
  { id: 'library', icon: '📔', jp: 'ピザ帳 (保存)', en: 'SAVED', route: '/library' },
  { id: 'journal', icon: '📓', jp: '振り返り帳 (作った)', en: 'JOURNAL', route: '/journal' },
];

function Avatar({
  size,
  initials,
  photoURL,
}: {
  size: number;
  initials: string;
  photoURL?: string | null;
}): JSX.Element {
  if (photoURL) {
    return (
      // 32px 以下の small avatar、LCP に影響しないので img で OK
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: size, objectFit: 'cover' }}
        referrerPolicy="no-referrer"
        draggable={false}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: '#F2D9CC',
        color: '#9F3220',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--mlpr-font-mincho)',
        fontWeight: 600,
        fontSize: size * 0.45,
      }}
    >
      {initials}
    </span>
  );
}

function Chevron({ dir }: { dir: 'right' }): JSX.Element {
  const path = dir === 'right' ? 'M9 5l7 7-7 7' : '';
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d={path}
        fill="none"
        stroke="#928571"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const HeaderDropdown = forwardRef<HTMLDivElement, HeaderDropdownProps>(
  function HeaderDropdown(
    { user, currentRoute, onSelect, onSignOut, role, onKeyDown }: HeaderDropdownProps,
    ref,
  ) {
    const router = useRouter();

    const handleNav = (route: Item['route']) => {
      onSelect?.();
      router.push(route);
    };

    return (
      <div
        ref={ref as RefObject<HTMLDivElement>}
        role={role}
        aria-label="ユーザーメニュー"
        className={styles.menu}
        onKeyDown={onKeyDown}
      >
        <div className={styles.userRow}>
          <Avatar size={38} initials={user.initials} photoURL={user.photoURL ?? null} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.displayName}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
        </div>

        {ITEMS.map((it) => {
          const active = it.route === currentRoute;
          const itemClass = [styles.item, active && styles['item--active']]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => handleNav(it.route)}
            >
              {active ? <span aria-hidden className={styles.activeBar} /> : null}
              <span aria-hidden className={styles.itemIcon}>
                {it.icon}
              </span>
              <span className={styles.itemBody}>
                <span className={styles.itemJp}>{it.jp}</span>
                <span className={styles.itemEn}>{it.en}</span>
              </span>
              <Chevron dir="right" />
            </button>
          );
        })}

        <div className={styles.divider} />
        <button
          type="button"
          role="menuitem"
          className={styles.signOut}
          onClick={() => {
            onSelect?.();
            onSignOut();
          }}
        >
          <span aria-hidden className={styles.signOutIcon}>
            ↪
          </span>
          <span>サインアウト</span>
        </button>
      </div>
    );
  },
);
