'use client';

/**
 * JournalEmpty — フィードバック未記録時の空状態 (Slice 7)
 *
 * 設計: design/slice7-screens.jsx JournalEmpty @ L505
 *
 * - 円形プレースホルダ + headline + body
 * - 「まずは保存帳から」ヒントカード → /library
 */

import { useRouter } from 'next/navigation';

import styles from './JournalEmpty.module.css';

import type { JSX } from 'react';

function StarOutlineIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartFilledIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 21s-7-4.35-9-8.5C1.5 8.5 4 5 7.5 5c2 0 3.5 1 4.5 2.5C13 6 14.5 5 16.5 5 20 5 22.5 8.5 21 12.5 19 16.65 12 21 12 21z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JournalEmpty(): JSX.Element {
  const router = useRouter();
  return (
    <div className={styles.wrap}>
      <div className={styles.circle} aria-hidden>
        <StarOutlineIcon size={36} />
        <div className={styles.innerDash} />
      </div>
      <h2 className={styles.headline}>
        まだ振り返った
        <br />
        一枚はありません。
      </h2>
      <p className={styles.body}>
        作ってみた感想を残すと、
        <br />
        ここに ★ と一緒に並びます。
      </p>

      <button type="button" className={styles.hintCard} onClick={() => router.push('/library')}>
        <span className={styles.hintIcon}>
          <HeartFilledIcon size={20} />
        </span>
        <span className={styles.hintBody}>
          <span className={styles.hintTitle}>まずは保存帳から</span>
          <span className={styles.hintDesc}>気になる一枚を選んで「作ってみる」へ。</span>
        </span>
        <span className={styles.chev} aria-hidden>
          <ChevronRight />
        </span>
      </button>
    </div>
  );
}
