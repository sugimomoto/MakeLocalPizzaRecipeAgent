/**
 * MetaStrip — 詳細画面の俯瞰メタ (人数 / 所要 / 焼成温度 / 難易度) 4 セル横並び。
 *
 * meta が null の間は薄いプレースホルダ ("—") を出す。
 * mono 数字とミニラベルの組合せ (CandidatesClient.module.css の和洋ミックスに揃える)。
 */

import styles from './MetaStrip.module.css';

import type { RecipeMeta } from '@/domain/recipe';

export type MetaStripProps = {
  meta: RecipeMeta | null;
};

const PLACEHOLDER = '—';

export function MetaStrip({ meta }: MetaStripProps) {
  const cells: Array<{ label: string; value: string }> = [
    { label: 'SERVES', value: meta?.servings ?? PLACEHOLDER },
    { label: 'TIME', value: meta?.duration ?? PLACEHOLDER },
    { label: 'TEMP', value: meta?.bakingTemp ?? PLACEHOLDER },
    { label: 'LEVEL', value: meta?.difficulty ?? PLACEHOLDER },
  ];

  return (
    <dl
      className={styles.strip}
      aria-label="レシピの基本情報"
      aria-busy={meta === null ? 'true' : 'false'}
    >
      {cells.map((cell) => (
        <div key={cell.label} className={styles.cell}>
          <dt className={styles.label}>{cell.label}</dt>
          <dd className={styles.value}>{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}
