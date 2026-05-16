/**
 * Chip — 多選択チップ。selected で active 表示に切替。
 * tones: default/shu/matcha/yamabuki/ai/ghost (passive 配色)
 * 元: design/pizza-tokens.jsx の Chip コンポーネント
 *
 * 単体ボタン (button 要素)。カウンタ要素やフォーム要素にしない。
 */

import styles from './Chip.module.css';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ChipTone = 'default' | 'shu' | 'matcha' | 'yamabuki' | 'ai' | 'ghost';
export type ChipSize = 'sm' | 'md';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  selected?: boolean;
  icon?: ReactNode;
};

export function Chip({
  children,
  tone = 'default',
  size = 'md',
  selected = false,
  icon,
  className,
  type = 'button',
  ...rest
}: ChipProps) {
  const classes = [
    styles.chip,
    styles[`size-${size}`],
    styles[`tone-${tone}`],
    selected ? styles.selected : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} aria-pressed={selected} {...rest}>
      {icon}
      {children}
    </button>
  );
}
