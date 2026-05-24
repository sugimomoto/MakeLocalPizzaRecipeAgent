'use client';

/**
 * DotsInput — 5 段階の観点別評価 (Slice 7)
 *
 * 仕様 (FR-7-10):
 * - 5 つのドット ● をタップで「その位置までを点灯」
 * - 同じ位置を再タップで **1 段戻す** (n→n-1)
 * - キーボード: ←→ で増減、Home/End で 0/5
 * - role="slider" + aria-valuemin=0 / aria-valuemax=5 / aria-valuenow
 */

import { useCallback, type JSX } from 'react';

import styles from './DotsInput.module.css';

import type { FeedbackScore } from '@/domain/feedback';

export type DotsInputProps = {
  value: FeedbackScore;
  onChange: (next: FeedbackScore) => void;
  label: string;
  max?: number;
  disabled?: boolean;
};

export function DotsInput({
  value,
  onChange,
  label,
  max = 5,
  disabled = false,
}: DotsInputProps): JSX.Element {
  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(Math.min(max, value + 1) as FeedbackScore);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(Math.max(0, value - 1) as FeedbackScore);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onChange(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        onChange(max as FeedbackScore);
        return;
      }
    },
    [value, onChange, max, disabled],
  );

  const handleClick = useCallback(
    (n: number) => {
      if (disabled) return;
      // 同じ位置を再タップで 1 段戻す
      const next =
        n === value ? (n - 1 < 0 ? 0 : ((n - 1) as FeedbackScore)) : (n as FeedbackScore);
      onChange(next);
    },
    [value, onChange, disabled],
  );

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={value === 0 ? '未評価' : `${value} / ${max}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKey}
      className={styles.root}
    >
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        const filled = n <= value;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${label} ${n} 段階目`}
            tabIndex={-1}
            disabled={disabled}
            className={`${styles.dot} ${filled ? styles['dot--filled'] : ''}`.trim()}
            onClick={() => handleClick(n)}
          />
        );
      })}
    </div>
  );
}
