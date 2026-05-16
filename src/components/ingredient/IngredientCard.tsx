/**
 * IngredientCard — 食材 1 件を表示するカード。タップで選択切替。
 *
 * - 画像未対応 (Slice 1): プレースホルダ (品名 emoji 風)
 * - 季節バッジ (複数許容、Chip 表示用)
 * - selected で枠線 + 右上にチェックバッジ
 *
 * onToggle が必須 — 食材選択画面で必ず使う想定。
 */

import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';

import styles from './IngredientCard.module.css';

import type { Ingredient, Season } from '@/domain/ingredient';

const SEASON_LABEL: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
  'all-year': '通年',
};

export type IngredientCardProps = {
  ingredient: Ingredient;
  selected: boolean;
  onToggle: (id: string) => void;
};

export function IngredientCard({ ingredient, selected, onToggle }: IngredientCardProps) {
  return (
    <Card
      asButton
      onClick={() => onToggle(ingredient.id)}
      padding="none"
      elevated={selected}
      className={[styles.card, selected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-pressed={selected}
      aria-label={`${ingredient.name}${selected ? ' (選択中)' : ''}`}
    >
      <div className={styles.placeholder} aria-hidden="true">
        {ingredient.name.slice(0, 2)}
      </div>

      <h3 className={styles.name}>{ingredient.name}</h3>

      {ingredient.story && <p className={styles.story}>{ingredient.story}</p>}

      <div className={styles.badges}>
        {ingredient.seasons.map((s) => (
          <Chip key={s} tone="ghost" size="sm">
            {SEASON_LABEL[s]}
          </Chip>
        ))}
      </div>

      {selected && (
        <span className={styles.checkBadge} aria-hidden="true">
          ✓
        </span>
      )}
    </Card>
  );
}
