/**
 * Card — 和紙風カード (kinari 紙色 + ヘアライン + 浮き影)。
 *
 * - padding: none/sm/md/lg
 * - elevated で浮き影を強調 (候補カード等)
 * - asButton + onClick で interactive (ホバー浮き上がり + フォーカスリング)
 */

import styles from './Card.module.css';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type BaseProps = {
  padding?: CardPadding;
  elevated?: boolean;
  className?: string;
  children?: ReactNode;
};

type DivCardProps = BaseProps & HTMLAttributes<HTMLDivElement> & { asButton?: false };
type ButtonCardProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { asButton: true };

export type CardProps = DivCardProps | ButtonCardProps;

export function Card(props: CardProps) {
  const { padding = 'md', elevated = false, className, children } = props;

  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    elevated ? styles.elevated : null,
    props.asButton ? styles.interactive : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (props.asButton) {
    const {
      asButton: _asButton,
      padding: _p,
      elevated: _e,
      className: _c,
      children: _ch,
      type,
      ...rest
    } = props;
    void _asButton;
    void _p;
    void _e;
    void _c;
    void _ch;
    return (
      <button type={type ?? 'button'} className={classes} {...rest}>
        {children}
      </button>
    );
  }

  const {
    asButton: _asButton,
    padding: _p,
    elevated: _e,
    className: _c,
    children: _ch,
    ...rest
  } = props;
  void _asButton;
  void _p;
  void _e;
  void _c;
  void _ch;
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
