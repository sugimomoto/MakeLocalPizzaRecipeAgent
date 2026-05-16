/**
 * SeasonTab — 季節 (spring/summer/autumn/winter/all-year) 選択タブ群。
 * ミニアイコン + 日本語ラベル。
 *
 * value=null は「すべての季節」を意味する (フィルタ無し)。
 */

import { SEASONS } from '@/domain/ingredient';

import styles from './SeasonTab.module.css';

import type { Season } from '@/domain/ingredient';

const SEASON_LABEL: Record<Season, { jp: string; icon: string }> = {
  spring: { jp: '春', icon: '🌸' },
  summer: { jp: '夏', icon: '🍃' },
  autumn: { jp: '秋', icon: '🍁' },
  winter: { jp: '冬', icon: '❄' },
  'all-year': { jp: '通年', icon: '◎' },
};

export type SeasonTabProps = {
  value: Season | null;
  onChange: (season: Season | null) => void;
  /** "すべて" タブを表示するか (default: true) */
  showAll?: boolean;
};

export function SeasonTab({ value, onChange, showAll = true }: SeasonTabProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="季節フィルタ">
      {showAll && (
        <button
          type="button"
          role="tab"
          aria-selected={value === null}
          className={[styles.tab, value === null ? styles.active : null].filter(Boolean).join(' ')}
          onClick={() => onChange(null)}
        >
          すべて
        </button>
      )}
      {SEASONS.map((s) => {
        const label = SEASON_LABEL[s];
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={value === s}
            className={[styles.tab, value === s ? styles.active : null].filter(Boolean).join(' ')}
            onClick={() => onChange(s)}
          >
            <span className={styles.icon} aria-hidden="true">
              {label.icon}
            </span>
            {label.jp}
          </button>
        );
      })}
    </div>
  );
}
