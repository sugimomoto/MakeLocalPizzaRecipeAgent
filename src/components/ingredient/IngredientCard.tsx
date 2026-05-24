/**
 * IngredientCard — 食材 1 件を表示するカード。タップで選択切替。
 *
 * - Slice 7 後: 旧「品名先頭 2 文字」placeholder からカテゴリ emoji + 和紙地 +
 *   季節カラーアクセントに変更 (写真素材なしで 30 食材を即時整える方針)
 * - 季節バッジ (複数許容、Chip 表示用)
 * - selected で枠線 + 右上にチェックバッジ
 *
 * onToggle が必須 — 食材選択画面で必ず使う想定。
 */

import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';

import styles from './IngredientCard.module.css';

import type { Ingredient, IngredientCategory, Season } from '@/domain/ingredient';

const SEASON_LABEL: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
  'all-year': '通年',
};

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  vegetable: '🥬',
  seafood: '🐟',
  meat: '🥩',
  grain: '🌾',
  fruit: '🍎',
  cheese: '🧀',
};

/** 季節 → カードの上端リボンに乗せる色 (既存 CSS 変数を流用) */
const SEASON_RIBBON_VAR: Record<Season, string> = {
  spring: '--mlpr-shu-pale',
  summer: '--mlpr-matcha',
  autumn: '--mlpr-yamabuki',
  winter: '--mlpr-ai',
  'all-year': '--mlpr-kogane',
};

export type IngredientCardProps = {
  ingredient: Ingredient;
  selected: boolean;
  onToggle: (id: string) => void;
};

export function IngredientCard({ ingredient, selected, onToggle }: IngredientCardProps) {
  // 季節は複数のとき先頭で代表色を決める (例: せり=[winter, spring] → winter)
  const primarySeason = ingredient.seasons[0] ?? 'all-year';
  const ribbonStyle: React.CSSProperties = {
    background: `var(${SEASON_RIBBON_VAR[primarySeason]})`,
  };

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
        <span className={styles.seasonRibbon} style={ribbonStyle} />
        <span className={styles.emoji}>{CATEGORY_EMOJI[ingredient.category]}</span>
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
