/**
 * StoryCard — シェフが語る一言を「ゲストに語る/見出し/本文」の 3 段で表示するカード。
 *
 * story が null の間はスケルトン (見出し + 1〜2 行)。
 */

import styles from './StoryCard.module.css';

import type { RecipeStory } from '@/domain/recipe';

export type StoryCardProps = {
  story: RecipeStory | null;
};

export function StoryCard({ story }: StoryCardProps) {
  if (story === null) {
    return (
      <aside className={styles.card} role="status" aria-label="ストーリーを生成中">
        <div className={[styles.skeleton, styles.skeletonEyebrow].join(' ')} />
        <div className={[styles.skeleton, styles.skeletonHeadline].join(' ')} />
        <div className={[styles.skeleton, styles.skeletonBody].join(' ')} />
      </aside>
    );
  }

  return (
    <aside className={styles.card} aria-label="シェフからの一言">
      <p className={styles.eyebrow}>{story.eyebrow}</p>
      <h3 className={styles.headline}>{story.headline}</h3>
      <p className={styles.body}>{story.body}</p>
    </aside>
  );
}
