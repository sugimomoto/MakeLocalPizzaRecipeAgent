'use client';

/**
 * OvenProfileSelector — Tap2 ヘッダ右に置く小さな機材プロファイル切替セレクタ (Slice 8)
 *
 * 設計: design/slice8-app.jsx OvenProfileToast の右上ピル + OvenProfileSheet
 *
 * - 押下で OvenProfileSheet (ボトムシート) を開く
 * - 確定で writeOvenProfile + Toast 表示 (取消可能)
 * - 表示文言は `useOvenProfile()` の現在値を反映
 *
 * Tap2 (`/ingredients`) のヘッダ右に配置する想定。地元ピル
 * (`📍 [地元名] ▾`) と並列で扱う。
 */

import { useState } from 'react';

import { type OvenProfileId } from '@/domain/oven-profile';
import { useOvenProfile } from '@/hooks/use-oven-profile';
import { useToast } from '@/hooks/use-toast';

import styles from './OvenProfileSelector.module.css';
import { OvenProfileSheet } from './OvenProfileSheet';

export function OvenProfileSelector(): React.JSX.Element {
  const { profile, profileId, setProfile, isHydrated } = useOvenProfile();
  const { push } = useToast();
  const [open, setOpen] = useState(false);

  const isHome = profileId === 'home_oven_280c_10m';

  const handleConfirm = (nextId: OvenProfileId) => {
    setOpen(false);
    if (nextId === profileId) return;

    const prevId = profileId;
    setProfile(nextId);

    push({
      kind: 'success',
      message: (
        <>
          <b>{nextId === 'enro_450c_90s' ? 'ENRO' : '家庭用オーブン'}</b> に切り替えました。
          次の提案は{' '}
          {nextId === 'enro_450c_90s' ? '400〜450°C / 90〜120 秒' : '250〜300°C / 8〜15 分'}
          前提で生成します。
          <button type="button" className={styles.undo} onClick={() => setProfile(prevId)}>
            取消
          </button>
        </>
      ),
    });
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.pill} ${isHome ? styles['pill--home'] : styles['pill--enro']}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`機材プロファイル: ${profile.jp}。タップで変更`}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden className={styles.emoji}>
          {/* hydrate 前はデフォルト emoji を出す (SSR と一致) */}
          {isHydrated ? profile.emoji : '🔥'}
        </span>
        <span className={styles.label}>
          {isHydrated ? (isHome ? '家庭用オーブン' : 'ENRO') : 'ENRO'}
        </span>
        <span aria-hidden className={styles.chev}>
          ▾
        </span>
      </button>
      <OvenProfileSheet
        open={open}
        currentProfileId={profileId}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
