'use client';

/**
 * ChipGroup — 多選択チップ (Slice 7)
 *
 * 仕様 (FR-7-10):
 * - タップ toggle、wrap (横スクロールしない)
 * - 塗りトーン: matcha / yamabuki / shu
 * - 各群上限 FEEDBACK_CHIP_CAP = 6 (7 個目で aria-disabled + onCapHit コールバック)
 * - 見出し右に選択数 (0 のとき非表示)
 */

import { useCallback, useMemo, type JSX } from 'react';

import { FEEDBACK_CHIP_CAP } from '@/domain/feedback';

import styles from './ChipGroup.module.css';

export type ChipTone = 'matcha' | 'yamabuki' | 'shu';

export type ChipGroupProps = {
  /** 見出し (明朝) */
  jpLabel: string;
  /** 英 caption (mono) */
  enLabel: string;
  /** 選択肢一覧 (マスタ準拠) */
  options: readonly string[];
  /** 現在選択中の文字列配列 (controlled) */
  value: string[];
  onChange: (next: string[]) => void;
  /** 選択トーン */
  tone?: ChipTone;
  /** 上限到達時 (= cap 個既に選択 + 未選択タップ) で呼ばれる */
  onCapHit?: () => void;
  disabled?: boolean;
};

export function ChipGroup({
  jpLabel,
  enLabel,
  options,
  value,
  onChange,
  tone = 'shu',
  onCapHit,
  disabled = false,
}: ChipGroupProps): JSX.Element {
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = useCallback(
    (chip: string) => {
      if (disabled) return;
      if (selectedSet.has(chip)) {
        onChange(value.filter((v) => v !== chip));
        return;
      }
      if (value.length >= FEEDBACK_CHIP_CAP) {
        onCapHit?.();
        return;
      }
      // マスタ順を保つために再構築
      const next = options.filter((o) => selectedSet.has(o) || o === chip);
      onChange(next);
    },
    [disabled, selectedSet, value, options, onChange, onCapHit],
  );

  const atCap = value.length >= FEEDBACK_CHIP_CAP;

  return (
    <div className={styles.group} role="group" aria-label={jpLabel}>
      <div className={styles.header}>
        <span className={styles.jpLabel}>{jpLabel}</span>
        <span className={styles.enLabel}>{enLabel}</span>
        {value.length > 0 && <span className={styles.count}>{value.length}</span>}
      </div>
      <div className={styles.chips}>
        {options.map((chip) => {
          const selected = selectedSet.has(chip);
          const disabledChip = !selected && atCap;
          const classes = [
            styles.chip,
            selected && styles['chip--selected'],
            tone === 'matcha' && styles['chip--matcha'],
            tone === 'yamabuki' && styles['chip--yamabuki'],
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={chip}
              type="button"
              className={classes}
              aria-pressed={selected}
              aria-disabled={disabledChip}
              onClick={() => toggle(chip)}
              disabled={disabled}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}
