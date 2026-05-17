/**
 * StepList — 番号付き手順。各ステップを縦に並べる。
 *
 * steps が null の間は数行分のスケルトン。番号は mono フォント。
 */

import styles from './StepList.module.css';

export type StepListProps = {
  steps: string[] | null;
  /** skeleton 表示時の行数 (default 4) */
  skeletonRows?: number;
};

export function StepList({ steps, skeletonRows = 4 }: StepListProps) {
  if (steps === null) {
    return (
      <ol className={styles.list} role="status" aria-label="手順を生成中">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <li key={i} className={styles.skeletonRow}>
            <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.skeletonText} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={styles.list} aria-label="手順一覧">
      {steps.map((step, i) => (
        <li key={i} className={styles.row}>
          <span className={styles.num} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className={styles.text}>{step}</span>
        </li>
      ))}
    </ol>
  );
}
