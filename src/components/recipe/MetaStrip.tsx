/**
 * MetaStrip — 詳細画面の俯瞰メタ (枚数 / 所要 / 焼成温度 / 難易度) 4 セル横並び。
 *
 * meta が null の間は薄いプレースホルダ ("—") を出す。
 * mono 数字とミニラベルの組合せ (CandidatesClient.module.css の和洋ミックスに揃える)。
 *
 * label "MAKES": ピザは枚単位で焼くため「サーブ人数」より「作る枚数」が自然
 * (ユーザ要望、2026-05-24)。
 */

import styles from './MetaStrip.module.css';

import type { RecipeMeta } from '@/domain/recipe';

export type MetaStripProps = {
  meta: RecipeMeta | null;
};

const PLACEHOLDER = '—';

export function MetaStrip({ meta }: MetaStripProps) {
  const cells: Array<{ label: string; value: string }> = [
    { label: 'MAKES', value: meta?.servings ?? PLACEHOLDER },
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
