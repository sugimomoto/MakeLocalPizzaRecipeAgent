'use client';

/**
 * JournalCard — /journal の作った 1 枚カード (Slice 7)
 *
 * 設計: design/slice7-screens.jsx JournalCard @ L397
 *
 * 表示要素:
 * - hero pizza img + 戦略バッジ + 地名 (pin)
 * - title + StarRow + 作った日
 * - 観点別評価 4 軸の mini bar (グリッド 2x2)
 * - 効いた点タグ (matcha 色、最大 2 つ表示)
 */

import { useCallback, type JSX } from 'react';

import { StarRow } from '@/components/journal/StarRow';
import { FEEDBACK_AXIS_LABELS, FEEDBACK_AXIS_ORDER, STRATEGY_LABEL } from '@/domain/feedback';

import styles from './JournalCard.module.css';

import type { SavedRecipe } from '@/domain/saved-recipe';

export type JournalCardProps = {
  recipe: SavedRecipe;
  onOpen: (recipe: SavedRecipe) => void;
  /** 表示する効いた点タグ数 (デフォルト 2) */
  maxWorkedTags?: number;
};

function PinIcon(): JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 21s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function formatCookedAt(d: Date): string {
  // 例: 2026.05.13
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function JournalCard({ recipe, onOpen, maxWorkedTags = 2 }: JournalCardProps): JSX.Element {
  const handleClick = useCallback(() => onOpen(recipe), [onOpen, recipe]);
  const fb = recipe.feedback;
  if (!fb) {
    // 防御 (use-saved-recipes-journal でフィルタ済の前提だが念のため)
    return <></>;
  }
  const sealClass = `seal--${recipe.strategy}` as 'seal--exploit' | 'seal--tune' | 'seal--explore';
  const worked = fb.whatWorked.slice(0, maxWorkedTags);

  return (
    <button type="button" className={styles.card} onClick={handleClick}>
      <div className={styles.head}>
        <div className={styles.hero}>
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.imageUrl} alt="" referrerPolicy="no-referrer" />
          ) : null}
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={`${styles.seal} ${styles[sealClass]}`}>
              {STRATEGY_LABEL[recipe.strategy]}
            </span>
            <span className={styles.locale}>
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 3 }}>
                <PinIcon />
              </span>
              {recipe.prefecture}
            </span>
          </div>
          <div className={styles.title}>{recipe.title}</div>
          <div className={styles.starsRow}>
            <StarRow rating={fb.overallRating} />
            <span className={styles.cookedAt}>· 作った {formatCookedAt(fb.cookedAt)}</span>
          </div>
        </div>
      </div>

      {/* axes mini bars (4 軸グリッド) */}
      <div className={styles.axesGrid}>
        {FEEDBACK_AXIS_ORDER.map((axis) => {
          const v = fb.axes[axis];
          return (
            <div key={axis} className={styles.axisRow}>
              <span className={styles.axisLabel}>{FEEDBACK_AXIS_LABELS[axis]}</span>
              <span className={styles.axisBar}>
                <span className={styles.axisBarFill} style={{ width: `${v * 20}%` }} />
              </span>
              <span className={styles.axisValue}>{v}</span>
            </div>
          );
        })}
      </div>

      {/* 効いた点タグ */}
      {worked.length > 0 ? (
        <div className={styles.tags}>
          <span className={styles.tagsLabel}>効いた点</span>
          {worked.map((w) => (
            <span key={w} className={styles.tag}>
              {w}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
