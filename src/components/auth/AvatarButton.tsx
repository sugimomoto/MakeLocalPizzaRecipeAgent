'use client';

/**
 * AvatarButton — 各画面の topRow 右上に置くサインイン入口 / ライブラリ入口。
 *
 * - status='loading'        : 36px の透明プレースホルダ (レイアウトズレ防止のため非 null)
 * - status='unauthenticated': 「サインイン」テキストリンク (タップで openModal)
 * - status='authenticated'  : 32px 円 Avatar (photoURL → イニシャル の優先順)
 *                              タップで /library に遷移
 *
 * デザイン: design/slice4-screens.jsx の HeaderShowcase / LibraryScreen を参照。
 */
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useSignInModal } from '@/hooks/use-sign-in-modal';

import styles from './AvatarButton.module.css';

export type AvatarButtonProps = {
  /** クラス上書き (外側からのレイアウト調整用) */
  className?: string;
  /** 32 / 36 など。既定 32 */
  size?: number;
};

function getInitials(displayName: string | null, email: string | null): string {
  const name = (displayName ?? '').trim();
  if (name.length > 0) return name.slice(0, 1).toUpperCase();
  const local = (email ?? '').split('@')[0] ?? '';
  if (local.length > 0) return local.slice(0, 1).toUpperCase();
  return '？';
}

export function AvatarButton({ className, size = 32 }: AvatarButtonProps): React.JSX.Element {
  const { status, user } = useAuth();
  const { openModal } = useSignInModal();
  const router = useRouter();

  const initials = useMemo(
    () => getInitials(user?.displayName ?? null, user?.email ?? null),
    [user?.displayName, user?.email],
  );

  // SSR / hydration 中はクリック不能なプレースホルダ (レイアウトはキープ)
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
  const label = user?.displayName ?? user?.email ?? 'ピザ帳を開く';
  const sizeStyle = { width: size, height: size, borderRadius: size };
  return (
    <button
      type="button"
      className={`${styles.avatar} ${className ?? ''}`.trim()}
      style={sizeStyle}
      onClick={() => router.push('/library')}
      aria-label={`${label} のピザ帳を開く`}
    >
      {user?.photoURL ? (
        // next/image を使うと Google avatar 用の remotePatterns 設定が必要になる。
        // 32px の小さなアバターで LCP 影響もないので img を使う。
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
    </button>
  );
}
