/**
 * StatTile — /journal 上部の Stat タイル (Slice 7)
 * 設計: design/slice7-screens.jsx StatTile @ L373
 */

import styles from './StatTile.module.css';

import type { JSX } from 'react';

export type StatTileAccent = 'shu' | 'matcha' | 'yamabuki';

const ACCENT_VAR: Record<StatTileAccent, string> = {
  shu: 'var(--mlpr-shu)',
  matcha: 'var(--mlpr-matcha)',
  yamabuki: 'var(--mlpr-yamabuki)',
};

export type StatTileProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: StatTileAccent;
};

export function StatTile({ label, value, sub, accent = 'shu' }: StatTileProps): JSX.Element {
  return (
    <div className={styles.tile} style={{ ['--accent' as string]: ACCENT_VAR[accent] }}>
      <div className={styles.accent} aria-hidden />
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
