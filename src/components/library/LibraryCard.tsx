/**
 * LibraryCard — /library 画面で 1 件の保存済みレシピを表示するカード。
 *
 * デザイン (design/slice4-screens.jsx LibraryCard):
 *  ┌──────────────────────────────────────────────┐
 *  │ [72px サムネ] title (mincho, ellipsis 1 行) [♥]│
 *  │              [戦略 chip] [県名]              │
 *  │              [savedAt 日付 mono]             │
 *  └──────────────────────────────────────────────┘
 *
 * - カード全体クリック → onSelect (詳細画面へ遷移する想定)
 * - ハートクリック → onUnsave (stopPropagation で onSelect は発火しない)
 * - 画像が無いときは washi-deep の placeholder (ピザ絵文字 fallback)
 */
import { STRATEGY_LABELS, type Strategy } from '@/domain/candidate';

import styles from './LibraryCard.module.css';

import type { SavedRecipe } from '@/domain/saved-recipe';

export type LibraryCardProps = {
  recipe: SavedRecipe;
  onSelect: () => void;
  onUnsave?: () => void;
  /** Slice 7: フィードバック記録あり (= 「作った」) なら matcha のサブバッジを出す */
  cooked?: boolean;
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function strategyClass(strategy: Strategy): string {
  switch (strategy) {
    case 'exploit':
      return styles.sealExploit ?? '';
    case 'tune':
      return styles.sealTune ?? '';
    case 'explore':
      return styles.sealExplore ?? '';
  }
}

export function LibraryCard({
  recipe,
  onSelect,
  onUnsave,
  cooked = false,
}: LibraryCardProps): React.JSX.Element {
  const strategyLabel = STRATEGY_LABELS[recipe.strategy].japaneseLabel;
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onSelect}
      aria-label={`${recipe.title} を開く`}
    >
      <div className={styles.thumb}>
        {recipe.imageUrl ? (
          // SVG/PNG どちらでも素の img で良い (next/image は無効化)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.imageUrl} alt="" className={styles.thumbImage} />
        ) : (
          <span className={styles.thumbFallback} aria-hidden>
            🍕
          </span>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.title}>{recipe.title}</div>
        <div className={styles.subRow}>
          <span className={`${styles.seal} ${strategyClass(recipe.strategy)}`}>
            {strategyLabel}
          </span>
          <span className={styles.prefecture}>{recipe.prefecture}</span>
          {cooked && (
            <span className={styles.cookedBadge} aria-label="作った記録あり">
              <span className={styles.cookedDot} aria-hidden />
              作った
            </span>
          )}
        </div>
        <div className={styles.date}>{formatDate(recipe.savedAt)}</div>
      </div>
      {onUnsave && (
        <span
          className={styles.heart}
          role="button"
          tabIndex={0}
          aria-label={`${recipe.title} の保存を解除`}
          onClick={(e) => {
            e.stopPropagation();
            onUnsave();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onUnsave();
            }
          }}
        >
          ♥
        </span>
      )}
    </button>
  );
}
