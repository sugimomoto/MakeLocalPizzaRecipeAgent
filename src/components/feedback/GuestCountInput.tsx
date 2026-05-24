'use client';

/**
 * GuestCountInput — −/+ で 1〜20 を入力 (Slice 7)
 *
 * 仕様 (FR-7-10):
 * - 既定 — (未入力)、− で 1 から開始 / + で 1 〜 20 までキャップ
 * - 0 と空の区別なし (0 は意味なし、必須でもない)
 */

import { useCallback, type JSX } from 'react';

import { FEEDBACK_GUEST_COUNT_MAX, FEEDBACK_GUEST_COUNT_MIN } from '@/domain/feedback';

import styles from './GuestCountInput.module.css';

export type GuestCountInputProps = {
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
};

export function GuestCountInput({
  value,
  onChange,
  disabled = false,
}: GuestCountInputProps): JSX.Element {
  const dec = useCallback(() => {
    if (disabled) return;
    if (value === null || value <= FEEDBACK_GUEST_COUNT_MIN) {
      onChange(null);
      return;
    }
    onChange(value - 1);
  }, [value, onChange, disabled]);

  const inc = useCallback(() => {
    if (disabled) return;
    if (value === null) {
      onChange(FEEDBACK_GUEST_COUNT_MIN);
      return;
    }
    if (value >= FEEDBACK_GUEST_COUNT_MAX) return;
    onChange(value + 1);
  }, [value, onChange, disabled]);

  return (
    <div className={styles.row}>
      <span className={styles.label}>ゲスト</span>
      <div className={styles.control}>
        <button
          type="button"
          className={styles.button}
          aria-label="ゲスト数を 1 減らす"
          onClick={dec}
          disabled={disabled || value === null}
        >
          −
        </button>
        <span
          aria-live="polite"
          className={`${styles.value} ${value === null ? styles['value--empty'] : ''}`.trim()}
        >
          {value ?? '—'}
        </span>
        <button
          type="button"
          className={styles.button}
          aria-label="ゲスト数を 1 増やす"
          onClick={inc}
          disabled={disabled || value === FEEDBACK_GUEST_COUNT_MAX}
        >
          +
        </button>
      </div>
      <span className={styles.unit}>名</span>
      <span className={styles.spacer} />
      <span className={styles.optional}>任意</span>
    </div>
  );
}
