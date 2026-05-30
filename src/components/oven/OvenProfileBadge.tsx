'use client';

/**
 * OvenProfileBadge — 詳細画面 (/recipes/[id]) で「このレシピは X 機材プロファイルの前提で
 * 生成されました」を控えめに可視化する小さなピル (Slice 8)。
 *
 * 設計: design/slice8-app.jsx DetailOvenBadge @ L549
 * - ENRO 選択中は朱の薄塗り、家庭用オーブンは山吹の薄塗り
 * - タップで `/equipment` ガイドページへ遷移
 * - hydrate 前は ENRO デフォルトを表示 (SSR/CSR ハイドレーション一致)
 */

import Link from 'next/link';

import { useOvenProfile } from '@/hooks/use-oven-profile';

import styles from './OvenProfileBadge.module.css';

export function OvenProfileBadge(): React.JSX.Element {
  const { profile, profileId, isHydrated } = useOvenProfile();
  const isHome = isHydrated && profileId === 'home_oven_280c_10m';
  const label = isHydrated ? profile.jp : 'ENRO 電気ピザ窯';
  const emoji = isHydrated ? profile.emoji : '🔥';

  return (
    <Link
      href="/equipment"
      className={`${styles.badge} ${isHome ? styles['badge--home'] : styles['badge--enro']}`}
      aria-label={`機材プロファイル: ${label} (タップで機材ガイドへ)`}
    >
      <span aria-hidden className={styles.emoji}>
        {emoji}
      </span>
      <span className={styles.label}>{label} の前提</span>
      <span aria-hidden className={styles.chev}>
        ›
      </span>
    </Link>
  );
}
