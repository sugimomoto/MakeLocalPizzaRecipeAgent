/**
 * SharePageView — Slice 10 公開閲覧ページの描画 (Server Component)
 *
 * `/share/[shareId]` の中身。認証不要・read-only。
 * 既存の MaterialList / StepList / MetaStrip は client component (`'use client'`) だが
 * Server Component から import / render するのは Next.js の規約上 OK。
 */
import Link from 'next/link';

import { MaterialList } from '@/components/recipe/MaterialList';
import { MetaStrip } from '@/components/recipe/MetaStrip';
import { StepList } from '@/components/recipe/StepList';
import { StoryCard } from '@/components/recipe/StoryCard';
import { STRATEGY_LABELS } from '@/domain/candidate';

import styles from './SharePageView.module.css';

import type { SharedRecipeSnapshot } from '@/domain/share';

export type SharePageViewProps = {
  snapshot: SharedRecipeSnapshot;
};

export function SharePageView({ snapshot }: SharePageViewProps): React.JSX.Element {
  const strategyLabel = STRATEGY_LABELS[snapshot.strategy]?.japaneseLabel ?? '';

  return (
    <main
      className={`${styles.shell} mlpr-washi-noise mlpr-washi-noise--canvas`}
      aria-label="共有レシピ"
    >
      <header className={styles.brandBar}>
        <Link href="/" className={styles.brandLeft} aria-label="ふるさとピザ帳 TOP">
          <span aria-hidden className={styles.brandMark}>
            🍕
          </span>
          <span className={styles.brandName}>ふるさとピザ帳</span>
          <span className={styles.brandTag}>共有レシピ</span>
        </Link>
        <Link href="/local" className={styles.brandCta}>
          作ってみる →
        </Link>
      </header>

      <div className={styles.body}>
        <p className={styles.eyebrow}>
          {strategyLabel ? `今宵の一枚 · ${strategyLabel}` : '今宵の一枚'}
        </p>
        <h1 className={styles.title}>{snapshot.title}</h1>
        <p className={styles.locale}>📍 {snapshot.prefecture}</p>

        <div className={styles.heroImageWrap}>
          {snapshot.imageUrl ? (
            // 外部 URL の素 img (next/image を介さない)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshot.imageUrl}
              alt={snapshot.title}
              className={styles.heroImage}
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>

        {snapshot.concept ? <p className={styles.concept}>{snapshot.concept}</p> : null}

        <MetaStrip meta={snapshot.meta} />

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>食 材</h2>
          <MaterialList items={snapshot.materials} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>手 順</h2>
          <StepList steps={snapshot.steps} />
        </section>

        <StoryCard story={snapshot.story} />

        <section className={styles.footerCta}>
          <p className={styles.footerEyebrow}>あなたの地元でも、AI と一緒に。</p>
          <Link href="/local" className={styles.footerCtaButton}>
            ふるさとピザ帳で作ってみる →
          </Link>
        </section>

        <p className={styles.footerNote}>
          ふるさとピザ帳 — 地元食材から AI がピザ 3 案を提案するサービス。
        </p>
      </div>
    </main>
  );
}
