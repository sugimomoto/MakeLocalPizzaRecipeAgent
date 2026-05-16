/**
 * SectionLabel — 「北 海 道  ───── 6」のようなセクションヘッダ。
 * design/prototype-app.jsx の LocalScreen で地域区切りに使われているパターン。
 *
 * 字間広 + 伸びるヘアライン + mono フォントの件数バッジ。
 */

import styles from './SectionLabel.module.css';

export type SectionLabelProps = {
  jp: string;
  count?: number;
};

export function SectionLabel({ jp, count }: SectionLabelProps) {
  return (
    <div className={styles.label}>
      <span className={styles.jp}>{jp}</span>
      <span className={styles.line} aria-hidden="true" />
      {count !== undefined && (
        <span className={styles.count} aria-label={`${count} 件`}>
          {count}
        </span>
      )}
    </div>
  );
}
