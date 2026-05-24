'use client';

/**
 * CrossLink — 保存帳 ⇄ 振り返り帳 の往復ピル (Slice 7)
 *
 * 設計: design/slice7-screens.jsx CrossLink @ L247
 *
 * 例:
 *   <CrossLink to="/journal" label="振り返り帳へ" jp="振" en="JOURNAL" count="2 件" accent="matcha"/>
 */

import { useRouter } from 'next/navigation';

import styles from './CrossLink.module.css';

import type { JSX } from 'react';

export type CrossLinkAccent = 'shu' | 'matcha';

const ACCENT_VAR: Record<CrossLinkAccent, string> = {
  shu: 'var(--mlpr-shu)',
  matcha: 'var(--mlpr-matcha)',
};

export type CrossLinkProps = {
  to: string;
  /** 表面の主ラベル (明朝) */
  label: string;
  /** ピル先頭の和印 (1 文字、明朝) */
  jp: string;
  /** mono 系 caption */
  en: string;
  /** 件数表示 (任意) */
  count?: string;
  accent?: CrossLinkAccent;
};

function ChevronRight({ size = 11, color = 'currentColor' }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossLink({
  to,
  label,
  jp,
  en,
  count,
  accent = 'shu',
}: CrossLinkProps): JSX.Element {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.link}
      onClick={() => router.push(to)}
      aria-label={`${label} へ移動`}
      style={{ ['--accent' as string]: ACCENT_VAR[accent] }}
    >
      <span aria-hidden className={styles.icon}>
        {jp}
      </span>
      <span className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.meta}>{count ? `${en} · ${count}` : en}</span>
      </span>
      <span aria-hidden className={styles.chev}>
        <ChevronRight />
      </span>
    </button>
  );
}
