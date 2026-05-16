/**
 * Chip — 多選択チップ / 表示用ラベル。
 *
 * - onClick が渡された場合: button 要素 (selected で active 表示、aria-pressed)
 * - onClick が無い場合: span 要素 (display-only。CandidateCard 内など button 入れ子防止)
 *
 * tones: default/shu/matcha/yamabuki/ai/ghost (passive 配色)
 * 元: design/pizza-tokens.jsx の Chip コンポーネント
 */

import styles from './Chip.module.css';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export type ChipTone = 'default' | 'shu' | 'matcha' | 'yamabuki' | 'ai' | 'ghost';
export type ChipSize = 'sm' | 'md';

type BaseProps = {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  selected?: boolean;
  icon?: ReactNode;
  className?: string;
};

export type ChipProps = BaseProps &
  (
    | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
        onClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
      })
    | (Omit<HTMLAttributes<HTMLSpanElement>, keyof BaseProps> & { onClick?: undefined })
  );

export function Chip(props: ChipProps) {
  const { children, tone = 'default', size = 'md', selected = false, icon, className } = props;

  const classes = [
    styles.chip,
    styles[`size-${size}`],
    styles[`tone-${tone}`],
    selected ? styles.selected : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (props.onClick) {
    const {
      children: _children,
      tone: _tone,
      size: _size,
      selected: _selected,
      icon: _icon,
      className: _className,
      type,
      ...rest
    } = props;
    void _children;
    void _tone;
    void _size;
    void _selected;
    void _icon;
    void _className;
    return (
      <button type={type ?? 'button'} className={classes} aria-pressed={selected} {...rest}>
        {icon}
        {children}
      </button>
    );
  }

  const {
    children: _children,
    tone: _tone,
    size: _size,
    selected: _selected,
    icon: _icon,
    className: _className,
    onClick: _onClick,
    ...rest
  } = props;
  void _children;
  void _tone;
  void _size;
  void _selected;
  void _icon;
  void _className;
  void _onClick;
  return (
    <span className={classes} {...rest}>
      {icon}
      {children}
    </span>
  );
}
