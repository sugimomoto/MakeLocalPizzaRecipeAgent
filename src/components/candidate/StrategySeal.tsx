/**
 * StrategySeal — 朱印風の戦略印 (王道/一歩外す/大冒険)。
 * STRATEGY_LABELS の inkColor / bgColor (CSS 変数) を使う。
 *
 * 元: design/pizza-tokens.jsx の StrategySeal コンポーネント
 */

import { STRATEGY_LABELS } from '@/domain/candidate';

import styles from './StrategySeal.module.css';

import type { Strategy } from '@/domain/candidate';

const STRATEGY_EN: Record<Strategy, string> = {
  exploit: 'EXPLOIT',
  tune: 'TUNE',
  explore: 'EXPLORE',
};

export type StrategySealProps = {
  strategy: Strategy;
  size?: number;
  className?: string;
};

export function StrategySeal({ strategy, size = 56, className }: StrategySealProps) {
  const label = STRATEGY_LABELS[strategy];
  // tune は文字数が多いのでフォントを少し小さくする (元実装に合わせる)
  const fontSize = strategy === 'tune' ? 13 : 15;

  return (
    <div
      className={[styles.seal, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={`戦略: ${label.japaneseLabel} (${STRATEGY_EN[strategy]})`}
      style={{
        width: size,
        height: size,
        background: label.bgColor,
        color: label.inkColor,
        fontSize,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${label.inkColor} 25%, transparent)`,
      }}
    >
      <span className={styles.jp}>{label.japaneseLabel}</span>
      <span className={styles.en}>{STRATEGY_EN[strategy]}</span>
    </div>
  );
}
