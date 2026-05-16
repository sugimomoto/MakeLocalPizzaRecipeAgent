/**
 * CategoryTab — 食材カテゴリ (vegetable/seafood/cheese/grain/meat/fruit) 選択タブ。
 *
 * value=null は「すべてのカテゴリ」を意味する。
 * SeasonTab と同じスタイル (SeasonTab.module.css を流用)。
 */

import { INGREDIENT_CATEGORIES } from '@/domain/ingredient';

import styles from './SeasonTab.module.css';

import type { IngredientCategory } from '@/domain/ingredient';

const CATEGORY_LABEL: Record<IngredientCategory, { jp: string; icon: string }> = {
  vegetable: { jp: '野菜', icon: '🥬' },
  seafood: { jp: '魚介', icon: '🐟' },
  cheese: { jp: 'チーズ', icon: '🧀' },
  grain: { jp: '穀類', icon: '🌾' },
  meat: { jp: '肉', icon: '🥩' },
  fruit: { jp: '果物', icon: '🍎' },
};

export type CategoryTabProps = {
  value: IngredientCategory | null;
  onChange: (category: IngredientCategory | null) => void;
  showAll?: boolean;
};

export function CategoryTab({ value, onChange, showAll = true }: CategoryTabProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="カテゴリフィルタ">
      {showAll && (
        <button
          type="button"
          role="tab"
          aria-selected={value === null}
          className={[styles.tab, value === null ? styles.active : null].filter(Boolean).join(' ')}
          onClick={() => onChange(null)}
        >
          すべて
        </button>
      )}
      {INGREDIENT_CATEGORIES.map((c) => {
        const label = CATEGORY_LABEL[c];
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={value === c}
            className={[styles.tab, value === c ? styles.active : null].filter(Boolean).join(' ')}
            onClick={() => onChange(c)}
          >
            <span className={styles.icon} aria-hidden="true">
              {label.icon}
            </span>
            {label.jp}
          </button>
        );
      })}
    </div>
  );
}
