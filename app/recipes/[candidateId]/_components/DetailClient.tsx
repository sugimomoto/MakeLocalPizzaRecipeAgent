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

import { AvatarButton } from '@/components/auth/AvatarButton';
import { StrategySeal } from '@/components/candidate/StrategySeal';
import { FurusatoSection } from '@/components/furusato/FurusatoSection';
import { Button } from '@/components/primitives/Button';
import { SectionLabel } from '@/components/primitives/SectionLabel';
import { MaterialList } from '@/components/recipe/MaterialList';
import { MetaStrip } from '@/components/recipe/MetaStrip';
import { RecipeHero, type HeartSavedState } from '@/components/recipe/RecipeHero';
import { StepList } from '@/components/recipe/StepList';
import { StoryCard } from '@/components/recipe/StoryCard';
import { findPrefecture } from '@/data/prefectures';
import { STRATEGY_LABELS } from '@/domain/candidate';
import { useRecipeDetailStream } from '@/hooks/use-recipe-detail-stream';
import { useSavedRecipe } from '@/hooks/use-saved-recipe';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';
import { PENDING_RECIPE_KEY } from '@/lib/storage-keys';

import styles from './DetailClient.module.css';

import type { Candidate } from '@/domain/candidate';
import type { RecipeMaterial, RecipeMeta, RecipeStory } from '@/domain/recipe';

/** /library から開いたときに DetailClient へ運ばれる詳細スナップショット */
type SavedSnapshot = {
  meta: RecipeMeta;
  materials: RecipeMaterial[];
  steps: string[];
  story: RecipeStory;
  imageUrl: string;
};

type PendingRecipe = {
  candidateId: string;
  localeId: string;
  ingredients: string[];
  candidate: Candidate;
  /** /library 経由のみ。Slice 6 追加 */
  savedSnapshot?: SavedSnapshot;
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

  const saved = useSavedRecipe(candidateId);
  const { openModal } = useSignInModal();
  const toast = useToast();

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
    if (p.savedSnapshot) {
      // Slice 6: /library 経由は保存済みスナップショットから hydrate
      // (再生成・LLM 呼び出し不要)
      stream.hydrate({
        recipeId: p.candidateId,
        title: p.candidate.title,
        meta: p.savedSnapshot.meta,
        materials: p.savedSnapshot.materials,
        steps: p.savedSnapshot.steps,
        story: p.savedSnapshot.story,
        imageUrl: p.savedSnapshot.imageUrl,
      });
      return;
    }
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

  // saved.state ('loading'|'unauthenticated'|'unsaved'|'saved') を
  // RecipeHero の HeartSavedState (3 値) にマップ。loading は unsaved として描画
  // (チカチカ防止)。
  const heartState: HeartSavedState =
    saved.state === 'saved'
      ? 'saved'
      : saved.state === 'unauthenticated'
        ? 'unauthenticated'
        : 'unsaved';

  const handleHeart = async (): Promise<void> => {
    if (saved.state === 'loading') return;
    if (saved.state === 'unauthenticated') {
      openModal();
      return;
    }
    if (!pending || !candidate || !displayTitle) {
      // 詳細がまだ届く前の早押しはガード
      return;
    }
    // Slice 6: 詳細スナップショット (materials/steps/story) も一緒に
    // Firestore に保存して、/library から再訪問時に再生成不要にする。
    // stream.state === 'recipeDone' or 'allDone' まで揃っていれば詳細を保存。
    // (recipeDone = テキスト揃った時点、画像はまだ来てなくても保存可)
    if (stream.state !== 'recipeDone' && stream.state !== 'allDone') {
      toast.push({
        kind: 'warning',
        message: '詳細レシピが揃うまでお待ちください',
      });
      return;
    }
    try {
      if (saved.state === 'saved') {
        await saved.unsave();
        toast.push({ kind: 'success', message: '保存を解除しました' });
      } else {
        // unsaved → 候補 + 詳細スナップショットを Firestore へ
        const prefecture = findPrefecture(pending.localeId)?.prefecture ?? pending.localeId;
        await saved.save({
          candidateId,
          title: displayTitle,
          localeId: pending.localeId,
          prefecture,
          strategy: candidate.strategy,
          imageUrl: stream.imageUrl ?? '',
          ingredients: pending.ingredients,
          // 候補スナップショット
          concept: candidate.concept,
          keyIngredients: candidate.keyIngredients,
          sceneTags: candidate.sceneTags,
          why: candidate.why,
          // 詳細スナップショット (recipeDone まで揃ったタイミングのもの)
          ...(stream.meta && { meta: stream.meta }),
          ...(stream.materials && { materials: stream.materials }),
          ...(stream.steps && { steps: stream.steps }),
          ...(stream.story && { story: stream.story }),
        });
        toast.push({ kind: 'success', message: 'ピザ帳に保存しました' });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '保存処理に失敗しました。再度お試しください。';
      toast.push({
        kind: 'warning',
        message: `保存処理に失敗しました (${message})`,
      });
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <AvatarButton />
      </div>
      <RecipeHero
        imageUrl={stream.imageUrl}
        imageError={stream.imageError}
        onBack={() => router.back()}
        onSave={() => void handleHeart()}
        savedState={heartState}
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

        <FurusatoSection ingredientIds={pending?.ingredients ?? []} />

        <StoryCard story={stream.story} />
      </div>

      <div className={styles.stickyCtas}>
        <div className={styles.stickyInner}>
          <Button
            variant="shu"
            size="md"
            style={{ flex: 1 }}
            onClick={() => {
              // 「作ってみる」は Slice 5+ で調理開始フローに置き換え予定。
              // 一旦 alert で導線だけ残す。
              if (typeof window !== 'undefined') {
                window.alert('作ってみる (準備中)');
              }
            }}
          >
            作ってみる →
          </Button>
        </div>
      </div>
    </div>
  );
}
