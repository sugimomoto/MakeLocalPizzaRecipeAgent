'use client';

/**
 * /recipes/[candidateId] 画面の Client Component (Slice 3)。
 *
 * - 直前の /candidates 画面が sessionStorage に書いた pending recipe
 *   (candidate snapshot + localeId + ingredients) を取り出して
 *   useRecipeDetailStream.start(...) を 1 回呼ぶ
 * - レイアウト: RecipeHero → header (eyebrow + title + StrategySeal)
 *   → concept → MetaStrip → Section(食材) → Section(手順) → StoryCard → CTAs
 * - CTAs は alert (Slice 4 で Firestore 保存に差し替え)
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { StrategySeal } from '@/components/candidate/StrategySeal';
import { Button } from '@/components/primitives/Button';
import { SectionLabel } from '@/components/primitives/SectionLabel';
import { MaterialList } from '@/components/recipe/MaterialList';
import { MetaStrip } from '@/components/recipe/MetaStrip';
import { RecipeHero } from '@/components/recipe/RecipeHero';
import { StepList } from '@/components/recipe/StepList';
import { StoryCard } from '@/components/recipe/StoryCard';
import { STRATEGY_LABELS } from '@/domain/candidate';
import { useRecipeDetailStream } from '@/hooks/use-recipe-detail-stream';
import { PENDING_RECIPE_KEY } from '@/lib/storage-keys';

import styles from './DetailClient.module.css';

import type { Candidate } from '@/domain/candidate';

type PendingRecipe = {
  candidateId: string;
  localeId: string;
  ingredients: string[];
  candidate: Candidate;
};

export type DetailClientProps = {
  candidateId: string;
};

function readPendingRecipe(candidateId: string): PendingRecipe | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PENDING_RECIPE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingRecipe>;
    if (
      parsed &&
      parsed.candidateId === candidateId &&
      typeof parsed.localeId === 'string' &&
      Array.isArray(parsed.ingredients) &&
      parsed.candidate &&
      typeof parsed.candidate === 'object'
    ) {
      return parsed as PendingRecipe;
    }
    return null;
  } catch {
    return null;
  }
}

export function DetailClient({ candidateId }: DetailClientProps) {
  const router = useRouter();
  const stream = useRecipeDetailStream();
  const startedRef = useRef(false);
  const [pending, setPending] = useState<PendingRecipe | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    const p = readPendingRecipe(candidateId);
    if (!p) {
      router.replace('/ingredients');
      return;
    }
    startedRef.current = true;
    // 初回マウントの初期化なので setState を effect 内で行う (startedRef でガード済)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(p);
    void stream.start({
      candidateId: p.candidateId,
      localeId: p.localeId,
      ingredients: p.ingredients,
      candidate: p.candidate,
    });
  }, [candidateId, router, stream]);

  const candidate = pending?.candidate ?? null;
  const strategyLabel = candidate ? STRATEGY_LABELS[candidate.strategy].japaneseLabel : null;
  const displayTitle = stream.title ?? candidate?.title ?? null;

  function pseudoAlert(label: string) {
    if (typeof window !== 'undefined') {
      window.alert(`${label}\n(Slice 4 で Firestore 保存に差し替え予定)`);
    }
  }

  return (
    <div className={styles.shell}>
      <RecipeHero
        imageUrl={stream.imageUrl}
        imageError={stream.imageError}
        onBack={() => router.back()}
        onSave={() => {
          setIsSaved((v) => !v);
          pseudoAlert(isSaved ? '保存解除' : 'ピザ帳に保存');
        }}
        isSaved={isSaved}
        altText={displayTitle ?? 'pizza'}
      />

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.eyebrow}>
              {candidate ? `今宵の一枚 · ${strategyLabel}` : '今宵の一枚'}
            </p>
            {displayTitle ? (
              <h1 className={styles.title}>{displayTitle}</h1>
            ) : (
              <div className={styles.titleSkeleton} role="status" aria-label="タイトル生成中" />
            )}
          </div>
          {candidate && <StrategySeal strategy={candidate.strategy} size={56} />}
        </header>

        {candidate && <p className={styles.concept}>{candidate.concept}</p>}

        {stream.state === 'error' && (
          <div role="alert" className={styles.errorBox}>
            詳細レシピの生成に失敗しました: {stream.error}
          </div>
        )}

        <MetaStrip meta={stream.meta} />

        <section className={styles.section}>
          <SectionLabel jp="食 材" {...(stream.materials && { count: stream.materials.length })} />
          <MaterialList items={stream.materials} />
        </section>

        <section className={styles.section}>
          <SectionLabel jp="手 順" {...(stream.steps && { count: stream.steps.length })} />
          <StepList steps={stream.steps} />
        </section>

        <StoryCard story={stream.story} />
      </div>

      <div className={styles.stickyCtas}>
        <div className={styles.stickyInner}>
          <Button
            variant="ghost"
            size="md"
            style={{ flex: 1 }}
            onClick={() => pseudoAlert('ピザ帳に保存')}
          >
            ピザ帳に保存
          </Button>
          <Button
            variant="shu"
            size="md"
            style={{ flex: 1 }}
            onClick={() => pseudoAlert('作ってみる')}
          >
            作ってみる →
          </Button>
        </div>
      </div>
    </div>
  );
}
