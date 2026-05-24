/**
 * StarRow — 表示専用の ★ 行 (JournalCard で使う、Slice 7)
 *
 * StarInput と違い interactive ではない。aria-label で総合評価値を読み上げ。
 */

import type { FeedbackScore } from '@/domain/feedback';
import type { JSX } from 'react';

const YAMABUKI = '#DC8A2A';
const SUMI_MUTED = '#928571';

function StarIcon({ filled, size }: { filled: boolean; size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill={filled ? YAMABUKI : 'none'}
        stroke={filled ? YAMABUKI : SUMI_MUTED}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type StarRowProps = {
  rating: FeedbackScore;
  max?: number;
  size?: number;
  showValue?: boolean;
};

export function StarRow({
  rating,
  max = 5,
  size = 14,
  showValue = true,
}: StarRowProps): JSX.Element {
  return (
    <span
      role="img"
      aria-label={`総合評価 ${rating} / ${max}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
    >
      {Array.from({ length: max }).map((_, i) => (
        <StarIcon key={i} filled={i < rating} size={size} />
      ))}
      {showValue && (
        <span
          style={{
            fontFamily: 'var(--mlpr-font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--mlpr-sumi)',
            marginLeft: 4,
            letterSpacing: '0.5px',
          }}
        >
          {rating}.0
        </span>
      )}
    </span>
  );
}
