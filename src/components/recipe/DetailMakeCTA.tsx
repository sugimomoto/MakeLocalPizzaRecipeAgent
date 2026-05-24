'use client';

/**
 * DetailMakeCTA — /recipes/[id] の「作ってみる」カード CTA (Slice 7、案 A 採用)
 *
 * 設計: design/slice7-screens.jsx DetailCTA_A @ L851
 *
 * state:
 *   'guest'    — 未サインイン (押下で SignInModal 起動)
 *   'unsaved'  — サインイン済 + 未保存 (押下で「先に保存してください」Toast)
 *   'ready'    — サインイン済 + 保存済 (押下で /feedback/[id] へ)
 *
 * 既存ハート機能は本カードの右端に集約。RecipeHero 内のハートは別途維持。
 */

import styles from './DetailMakeCTA.module.css';

import type { JSX } from 'react';

export type DetailMakeCTAState = 'ready' | 'guest' | 'unsaved';

export type DetailMakeCTAProps = {
  state: DetailMakeCTAState;
  heartFilled: boolean;
  onMakeClick: () => void;
  onHeartClick: () => void;
  onSignInRequest?: () => void;
};

function FlameIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M13 2C9.8 5 7 8.9 7 12.7c0 3.5 2.5 6.3 6 6.3s6-2.8 6-6.3c0-2.5-1.4-4.6-3-6.4-.4 1.3-1.3 2.3-2.3 2.9.1-1.9.4-5.2-.7-7.2z"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 21s-7-4.35-9-8.5C1.5 8.5 4 5 7.5 5c2 0 3.5 1 4.5 2.5C13 6 14.5 5 16.5 5 20 5 22.5 8.5 21 12.5 19 16.65 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DetailMakeCTA({
  state,
  heartFilled,
  onMakeClick,
  onHeartClick,
  onSignInRequest,
}: DetailMakeCTAProps): JSX.Element {
  const disabled = state === 'guest';
  const heartClass = [styles.heartButton, heartFilled && styles['heartButton--filled']]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.makeButton}
          disabled={disabled}
          onClick={onMakeClick}
          aria-label="作ってみる"
        >
          <FlameIcon color={disabled ? '#928571' : '#fff'} />
          作ってみる
        </button>
        <button
          type="button"
          className={heartClass}
          onClick={onHeartClick}
          aria-label={heartFilled ? 'ピザ帳から外す' : 'ピザ帳に保存する'}
          aria-pressed={heartFilled}
        >
          <HeartIcon filled={heartFilled} />
        </button>
      </div>
      <div className={styles.hint}>
        {state === 'guest' && onSignInRequest ? (
          <>
            サインインで「振り返り帳」に記録できます。{' '}
            <button type="button" className={styles.signInLink} onClick={onSignInRequest}>
              サインイン
            </button>
          </>
        ) : state === 'unsaved' ? (
          '押すと自動でピザ帳に保存して、振り返り画面に進みます。'
        ) : (
          '作ったあと、★ で振り返りを残せます。'
        )}
      </div>
    </div>
  );
}
