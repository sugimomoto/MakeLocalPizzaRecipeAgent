/**
 * Button — 朱/山吹/藍/ghost の variant を持つ汎用ボタン。
 * デザイン仕様: design.md §4 (CSS Modules + tokens 参照)
 */

import styles from './Button.module.css';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'shu' | 'yamabuki' | 'ai' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = 'shu',
  size = 'md',
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[`variant-${variant}`], styles[`size-${size}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
