/**
 * ScreenHero — 各画面の上部「eyebrow + 大型 mincho 見出し + サブコピー」を汎用化。
 * design/prototype-app.jsx の Local/Loading/Ingredients/Detail 画面で繰り返されるパターン。
 *
 * 使い方:
 *   <ScreenHero
 *     eyebrow="地元 × ピザ"
 *     title={<>まずは、<br/>あなたの地元を。</>}
 *     sub="タップでそのまま次の食材選びへ。あとから変更できます。"
 *   />
 */

import styles from './ScreenHero.module.css';

import type { ReactNode } from 'react';

export type ScreenHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  /** eyebrow の色トーン (default: shu 朱色 / sumi 墨色) */
  eyebrowTone?: 'shu' | 'sumi';
};

export function ScreenHero({ eyebrow, title, sub, eyebrowTone = 'shu' }: ScreenHeroProps) {
  return (
    <header className={styles.hero}>
      {eyebrow && (
        <div
          className={[styles.eyebrow, eyebrowTone === 'sumi' ? styles.sumi : null]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {eyebrow}
        </div>
      )}
      <h1 className={styles.title}>{title}</h1>
      {sub && <p className={styles.sub}>{sub}</p>}
    </header>
  );
}
