'use client';

/**
 * StarInput — 1〜5 の総合 ★ を入力 (Slice 7)
 *
 * 仕様 (FR-7-10):
 * - タップで該当 ★ まで一括点灯
 * - 同じ ★ を再タップで **0 にクリア** (= 「未評価」)
 * - 半星 / ドラッグなし
 * - キーボード: フォーカス時 1〜5 数字キー、←→ で増減、0 で解除
 * - role="radiogroup" + 各 ★ aria-checked
 */

import { useCallback, useMemo, type JSX } from 'react';

import styles from './StarInput.module.css';

import type { FeedbackScore } from '@/domain/feedback';

export type StarInputProps = {
  value: FeedbackScore;
  onChange: (next: FeedbackScore) => void;
  size?: number;
  label?: string;
  /** disabled (Detail プレビュー時など) */
  disabled?: boolean;
};

function StarIcon({ filled, size }: { filled: boolean; size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarInput({
  value,
  onChange,
  size = 28,
  label = '総合評価',
  disabled = false,
}: StarInputProps): JSX.Element {
  const stars = useMemo(() => [1, 2, 3, 4, 5] as const, []);

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      // 1〜5 数字キー
      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        onChange(Number(e.key) as FeedbackScore);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        onChange(0);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(5, value + 1) as FeedbackScore;
        onChange(next);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.max(0, value - 1) as FeedbackScore;
        onChange(next);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onChange(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        onChange(5);
        return;
      }
    },
    [onChange, value, disabled],
  );

  const handleClick = useCallback(
    (n: number) => {
      if (disabled) return;
      // 同じ★ 再タップで 0 にクリア
      const next = n === value ? 0 : n;
      onChange(next as FeedbackScore);
    },
    [value, onChange, disabled],
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.root}
      onKeyDown={onKey}
      tabIndex={0}
    >
      {stars.map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${n} つ星`}
            tabIndex={-1}
            disabled={disabled}
            className={`${styles.star} ${filled ? styles['star--filled'] : ''}`.trim()}
            onClick={() => handleClick(n)}
          >
            <StarIcon filled={filled} size={size} />
          </button>
        );
      })}
    </div>
  );
}
