'use client';

/**
 * FurusatoSection — 詳細画面の「手 順」と StoryCard の間に挿入されるセクション。
 *
 * 状態 (useFurusatoItems.state):
 * - 'disabled' → return null (env off)
 * - 'loading'  → Header + Skeleton × 2
 * - 'ready' + items.length === 0 → return null (案 X: 非表示)
 * - 'ready' + items.length > 0 → Header + FurusatoCard リスト + Credit
 *
 * 注: error は内部で受けるが、UI には小さくテキスト 1 行で出すのみ (詳細画面の
 * 流れを邪魔しない)。warning Toast との連動は将来検討。
 */
import { useFurusatoItems } from '@/hooks/use-furusato-items';

import { FurusatoCard } from './FurusatoCard';
import styles from './FurusatoSection.module.css';
import { FurusatoSkeleton } from './FurusatoSkeleton';
import { RakutenCredit } from './RakutenCredit';

export type FurusatoSectionProps = {
  ingredientIds: readonly string[];
};

export function FurusatoSection({ ingredientIds }: FurusatoSectionProps): React.JSX.Element | null {
  const { state, items, error } = useFurusatoItems(ingredientIds);

  if (state === 'disabled') return null;

  // 案 X: ready で 0 件ならセクション自体を非表示 (refresh 未走 / 在庫無し)
  const isReadyEmpty = state === 'ready' && items.length === 0;
  if (isReadyEmpty && !error) return null;

  return (
    <section className={styles.section} aria-label="ふるさと納税で取り寄せる">
      <header className={styles.header}>
        <span className={styles.headerJp}>取 寄</span>
        <span className={styles.headerLine} aria-hidden />
        <span className={styles.headerEn}>FURUSATO</span>
      </header>
      <p className={styles.subcopy}>
        このレシピの食材は、ふるさと納税の返礼品としても入手できます。
      </p>

      {state === 'loading' && (
        <div className={styles.list}>
          <FurusatoSkeleton />
          <FurusatoSkeleton />
        </div>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className={styles.list}>
          {items.map((it) => (
            <FurusatoCard key={it.itemId} item={it} />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className={styles.errorBox}>
          楽天ウェブサービスに接続できませんでした。時間をおいて再度お試しください。
        </div>
      )}

      <RakutenCredit />
    </section>
  );
}
