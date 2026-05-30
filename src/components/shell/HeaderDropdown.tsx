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
import { forwardRef, useEffect, useState } from 'react';

import { useOvenProfile } from '@/hooks/use-oven-profile';

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
  /** モノ表記の副題 (機材ガイドのみ profile-aware に上書き) */
  en: string;
  route: '/library' | '/journal' | '/equipment';
  /** true なら「NEW」バッジを表示 (per-user の localStorage フラグで抑制) */
  showNewBadge?: boolean;
};

const ITEMS: Item[] = [
  { id: 'library', icon: '📔', jp: 'ピザ帳 (保存)', en: 'SAVED', route: '/library' },
  { id: 'journal', icon: '📓', jp: '振り返り帳 (作った)', en: 'JOURNAL', route: '/journal' },
  { id: 'equipment', icon: '🔥', jp: '機材ガイド', en: 'EQUIPMENT', route: '/equipment' },
];

/**
 * localStorage の equipmentLinkSeen フラグを参照する。
 * `/equipment` へ訪問するか、Dropdown 経由で機材ガイドを開いたら true になる想定。
 * SSR 中は false、hydrate 後は実際の値。
 */
export const EQUIPMENT_LINK_SEEN_KEY = 'mlpr.equipmentLinkSeen.v1';

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
    const { profile, isHydrated } = useOvenProfile();
    const showNewBadge = useEquipmentLinkSeen() === false;

    const handleNav = (route: Item['route']) => {
      onSelect?.();
      if (route === '/equipment') {
        markEquipmentLinkSeen();
      }
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
          const isEquipment = it.id === 'equipment';
          // 機材ガイドの副題は「現在のプロファイル名」を表示 (mincho/gothic 寄り)。
          // hydrate 前は SSR と一致させるため固定の "現在: ENRO" を返す。
          const subtitle = isEquipment ? (
            <span className={styles.itemProfile}>
              {isHydrated ? profile.emoji : '🔥'} 現在:{' '}
              {isHydrated ? profile.jp : 'ENRO 電気ピザ窯'}
            </span>
          ) : (
            <span className={styles.itemEn}>{it.en}</span>
          );
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
                <span className={styles.itemTitleRow}>
                  <span className={styles.itemJp}>{it.jp}</span>
                  {isEquipment && showNewBadge ? (
                    <span aria-label="新機能" className={styles.itemNew}>
                      NEW
                    </span>
                  ) : null}
                </span>
                {subtitle}
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

/**
 * /equipment 訪問時に localStorage フラグを立てる (NEW バッジ抑制用)。
 * `/equipment` 側からも呼ぶし、Dropdown 経由でクリックされた時もここで立てる。
 */
export function markEquipmentLinkSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EQUIPMENT_LINK_SEEN_KEY, '1');
  } catch {
    /* ignore (Safari private mode 等) */
  }
}

/**
 * フラグの読み取り。SSR と初回 client render は常に true (= NEW を出さない) を返し、
 * hydrate 後の useEffect で実際の値に切り替える。これにより SSR/CSR 不整合を避ける。
 *
 * 未訪問なら false、訪問済なら true。
 */
function useEquipmentLinkSeen(): boolean {
  const [seen, setSeen] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(window.localStorage.getItem(EQUIPMENT_LINK_SEEN_KEY) === '1');
    } catch {
      setSeen(true);
    }
  }, []);
  return seen;
}
