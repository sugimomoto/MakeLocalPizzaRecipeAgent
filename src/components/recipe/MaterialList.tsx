/**
 * MaterialList — 材料一覧。name と quantity を 2 段組で表示。
 *
 * items が null の間は数行分のスケルトンを表示。
 */

import styles from './MaterialList.module.css';

import type { RecipeMaterial } from '@/domain/recipe';

export type MaterialListProps = {
  items: RecipeMaterial[] | null;
  /** skeleton 表示時の行数 (default 5) */
  skeletonRows?: number;
};

export function MaterialList({ items, skeletonRows = 5 }: MaterialListProps) {
  if (items === null) {
    return (
      <ul className={styles.list} role="status" aria-label="材料を生成中">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <li key={i} className={styles.skeletonRow}>
            <span className={styles.skeletonName} />
            <span className={styles.skeletonQty} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.list} aria-label="材料一覧">
      {items.map((m, i) => (
        <li key={`${m.name}-${i}`} className={styles.row}>
          <span className={styles.name}>{m.name}</span>
          <span className={styles.dotLeader} aria-hidden="true" />
          <span className={styles.quantity}>{m.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
