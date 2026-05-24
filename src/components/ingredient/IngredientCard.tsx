/**
 * IngredientCard — 食材 1 件を表示するカード。タップで選択切替。
 *
 * 設計: design/pizza-screens.jsx ScreenIngredients > ingredient grid @ L260
 *
 * レイアウト:
 *   ┌──────────────┐
 *   │ [emoji tile] │ 40x40, tone カラー 12% 透過の薄塗り
 *   │              │
 *   │ [春] [葉菜]  │ 季節 + カテゴリ Badge (chip 風)
 *   │ せり         │ mincho 16px
 *   │ 名取・三角…  │ sub 10px (story を流用)
 *   └──────────────┘
 *   選択中: 朱色 1.5px ボーダー + 右上に朱色チェック (背景は kinari のまま)
 *
 * Card primitive は使わず直接 button にする (kinari 維持 + 朱ボーダーのみで
 * 反転させない design 要件と、Card primitive の hover/elevated 効果が衝突する
 * ため)。
 */

import styles from './IngredientCard.module.css';

import type { Ingredient, IngredientCategory, Season } from '@/domain/ingredient';

const SEASON_LABEL: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
  'all-year': '通年',
};

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  vegetable: '野菜',
  seafood: '魚介',
  meat: '肉',
  grain: '穀物',
  fruit: '果物',
  cheese: 'チーズ',
};

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  vegetable: '🥬',
  seafood: '🐟',
  meat: '🥩',
  grain: '🌾',
  fruit: '🍎',
  cheese: '🧀',
};

/** category → 左上タイルの tone カラー (design の matcha/ai/yamabuki/shu に対応) */
const CATEGORY_TONE: Record<IngredientCategory, string> = {
  vegetable: '96, 119, 68', // matcha
  seafood: '62, 86, 112', // ai
  fruit: '220, 138, 42', // yamabuki
  cheese: '220, 138, 42', // yamabuki
  meat: '200, 65, 42', // shu
  grain: '190, 147, 74', // kogane
};

/** 季節アイコン (小型 SVG)。design の SI[] の簡素版。 */
function SeasonIcon({ season, color }: { season: Season; color: string }): React.ReactNode {
  const s = 10;
  switch (season) {
    case 'spring':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill={color} aria-hidden focusable="false">
          {[0, 1, 2, 3, 4].map((i) => {
            const a = ((i * 72 - 90) * Math.PI) / 180;
            const x = 8 + Math.cos(a) * 4.2;
            const y = 8 + Math.sin(a) * 4.2;
            return (
              <ellipse
                key={i}
                cx={x}
                cy={y}
                rx="2.2"
                ry="3.2"
                transform={`rotate(${i * 72} ${x} ${y})`}
              />
            );
          })}
          <circle cx="8" cy="8" r="1.4" fill="#DC8A2A" />
        </svg>
      );
    case 'summer':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden
          focusable="false"
        >
          <circle cx="8" cy="8" r="3" fill={color} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={8 + Math.cos(a) * 5}
                y1={8 + Math.sin(a) * 5}
                x2={8 + Math.cos(a) * 7}
                y2={8 + Math.sin(a) * 7}
              />
            );
          })}
        </svg>
      );
    case 'autumn':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill={color} aria-hidden focusable="false">
          <path d="M8 2c-2 2-3 3-3 5 0 1 1 2 2 2 0 1-1 1-1 2l2 1 2-1c0-1-1-1-1-2 1 0 2-1 2-2 0-2-1-3-3-5z" />
        </svg>
      );
    case 'winter':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden
          focusable="false"
        >
          <line x1="8" y1="2" x2="8" y2="14" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="3.8" y1="3.8" x2="12.2" y2="12.2" />
          <line x1="12.2" y1="3.8" x2="3.8" y2="12.2" />
        </svg>
      );
    case 'all-year':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          aria-hidden
          focusable="false"
        >
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 4v4l3 2" strokeLinecap="round" />
        </svg>
      );
  }
}

export type IngredientCardProps = {
  ingredient: Ingredient;
  selected: boolean;
  onToggle: (id: string) => void;
};

export function IngredientCard({ ingredient, selected, onToggle }: IngredientCardProps) {
  const tone = CATEGORY_TONE[ingredient.category];
  const primarySeason = ingredient.seasons[0] ?? 'all-year';

  return (
    <button
      type="button"
      onClick={() => onToggle(ingredient.id)}
      className={[styles.card, selected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-pressed={selected}
      aria-label={`${ingredient.name}${selected ? ' (選択中)' : ''}`}
    >
      {selected && (
        <span className={styles.checkBadge} aria-hidden="true">
          ✓
        </span>
      )}

      <div className={styles.toneTile} style={{ background: `rgba(${tone}, 0.12)` }} aria-hidden>
        <span className={styles.emoji}>{CATEGORY_EMOJI[ingredient.category]}</span>
      </div>

      <div className={styles.badges}>
        {/* 代表季節を 1 つだけ (複数あっても先頭) — design に合わせる */}
        <span className={styles.badge}>
          <SeasonIcon season={primarySeason} color="rgba(31, 26, 18, 0.55)" />
          <span>{SEASON_LABEL[primarySeason]}</span>
        </span>
        <span className={styles.badge}>
          <span className={styles.toneDot} style={{ background: `rgb(${tone})` }} aria-hidden />
          <span>{CATEGORY_LABEL[ingredient.category]}</span>
        </span>
      </div>

      <h3 className={styles.name}>{ingredient.name}</h3>
      {ingredient.story && <p className={styles.story}>{ingredient.story}</p>}
    </button>
  );
}
