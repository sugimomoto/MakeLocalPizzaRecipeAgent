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
import { OvenProfileBadge } from '@/components/oven/OvenProfileBadge';
import { SectionLabel } from '@/components/primitives/SectionLabel';
import { DetailMakeCTA, type DetailMakeCTAState } from '@/components/recipe/DetailMakeCTA';
import { MaterialList } from '@/components/recipe/MaterialList';
import { MetaStrip } from '@/components/recipe/MetaStrip';
import { RecipeHero, type HeartSavedState } from '@/components/recipe/RecipeHero';
import { StepList } from '@/components/recipe/StepList';
import { StoryCard } from '@/components/recipe/StoryCard';
import { HeaderRow } from '@/components/shell/HeaderRow';
import { findPrefecture } from '@/data/prefectures';
import { STRATEGY_LABELS } from '@/domain/candidate';
import { useRecipeDetailStream } from '@/hooks/use-recipe-detail-stream';
import { useSavedRecipe } from '@/hooks/use-saved-recipe';
import { useSignInModal } from '@/hooks/use-sign-in-modal';
import { useToast } from '@/hooks/use-toast';
import { readRecipeDetailCache, writeRecipeDetailCache } from '@/lib/cache/stream-cache';
import { readOvenProfile } from '@/lib/localstorage/oven-profile';
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

    // 復元優先順 (Slice 7 でキャッシュ層を追加):
    //   1. savedSnapshot (/library 経由、Firestore 永続データ)
    //   2. sessionStorage cache (同タブ内リロード復元)
    //   3. stream.start (初回生成、Vertex AI + Imagen 呼び出し)
    if (p.savedSnapshot) {
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

    const cached = readRecipeDetailCache(candidateId);
    if (cached) {
      stream.hydrate(cached);
      return;
    }

    // Slice 8: 機材プロファイルを localStorage から読み、API に注入。
    // 未設定なら API 側で ENRO (デフォルト) に解決される。
    const ovenProfile = readOvenProfile()?.id;
    void stream.start({
      candidateId: p.candidateId,
      localeId: p.localeId,
      ingredients: p.ingredients,
      candidate: p.candidate,
      ...(ovenProfile !== undefined && { ovenProfile }),
    });
  }, [candidateId, router, stream]);

  // stream が allDone (テキスト + 画像揃った状態) になったら sessionStorage に書き込み。
  // リロードしても同じ結果が即時表示される。画像がエラー (imageError) の場合でも
  // テキスト部分はキャッシュしておきたいので state は recipeDone も含めるが、その時は
  // imageUrl が空になるので useEffect 側でガード。
  useEffect(() => {
    if (stream.state !== 'allDone') return;
    if (
      !stream.title ||
      !stream.meta ||
      !stream.materials ||
      !stream.steps ||
      !stream.story ||
      !stream.imageUrl
    ) {
      return;
    }
    writeRecipeDetailCache(candidateId, {
      recipeId: candidateId,
      title: stream.title,
      meta: stream.meta,
      materials: stream.materials,
      steps: stream.steps,
      story: stream.story,
      imageUrl: stream.imageUrl,
    });
  }, [
    candidateId,
    stream.state,
    stream.title,
    stream.meta,
    stream.materials,
    stream.steps,
    stream.story,
    stream.imageUrl,
  ]);

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

  // Slice 7: DetailMakeCTA の state を auth + saved 状態から導出
  const makeCtaState: DetailMakeCTAState =
    saved.state === 'unauthenticated' ? 'guest' : saved.state === 'saved' ? 'ready' : 'unsaved';

  // 「作ってみる」: 未保存なら同タップで Firestore へ save → 完了後に /feedback へ。
  // 旧実装は handleHeart 経由で save していたが、handleHeart は throw せず Toast
  // で握りつぶすため、上位の `await` だけでは save 完了を確実に待てず、結果として
  // /feedback 遷移後に saved.state が 'unsaved' のまま見える問題があった。
  // ここでは saved.save() を直接 await して resolve を待ち、その後で push する。
  const handleMakeClick = async (): Promise<void> => {
    if (saved.state === 'unauthenticated') {
      openModal();
      return;
    }
    if (saved.state === 'loading') return;
    if (!pending || !candidate || !displayTitle) return;

    if (saved.state !== 'saved') {
      if (stream.state !== 'recipeDone' && stream.state !== 'allDone') {
        toast.push({
          kind: 'warning',
          message: '詳細レシピが揃うまでお待ちください',
        });
        return;
      }
      try {
        const prefecture = findPrefecture(pending.localeId)?.prefecture ?? pending.localeId;
        await saved.save({
          candidateId,
          title: displayTitle,
          localeId: pending.localeId,
          prefecture,
          strategy: candidate.strategy,
          imageUrl: stream.imageUrl ?? '',
          ingredients: pending.ingredients,
          concept: candidate.concept,
          keyIngredients: candidate.keyIngredients,
          sceneTags: candidate.sceneTags,
          why: candidate.why,
          ...(stream.meta && { meta: stream.meta }),
          ...(stream.materials && { materials: stream.materials }),
          ...(stream.steps && { steps: stream.steps }),
          ...(stream.story && { story: stream.story }),
        });
        toast.push({ kind: 'success', message: 'ピザ帳に保存しました' });
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存処理に失敗しました';
        toast.push({ kind: 'warning', message: `保存に失敗しました (${message})` });
        return;
      }
    }
    router.push(`/feedback/${encodeURIComponent(candidateId)}`);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <HeaderRow title="詳細レシピ" rightSlot={<AvatarButton />} />
      </div>
      <div className={styles.heroWrap}>
        <RecipeHero
          imageUrl={stream.imageUrl}
          imageError={stream.imageError}
          onBack={() => router.back()}
          onSave={() => void handleHeart()}
          savedState={heartState}
          altText={displayTitle ?? 'pizza'}
        />
      </div>

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
        <div className={styles.ovenBadgeRow}>
          <OvenProfileBadge />
        </div>

        {/* 上部 CTA — 下まで降りなくても押せるように Slice 7 で追加。
            同じ state / handler を共有するので、下部 CTA と挙動が完全一致する */}
        <DetailMakeCTA
          state={makeCtaState}
          heartFilled={saved.state === 'saved'}
          onMakeClick={() => void handleMakeClick()}
          onHeartClick={() => void handleHeart()}
          onSignInRequest={openModal}
        />

        <section className={styles.section}>
          <SectionLabel jp="食 材" {...(stream.materials && { count: stream.materials.length })} />
          <MaterialList items={stream.materials} />
        </section>

        <section className={styles.section}>
          <SectionLabel jp="手 順" {...(stream.steps && { count: stream.steps.length })} />
          <StepList steps={stream.steps} />
        </section>

        <StoryCard story={stream.story} />

        <FurusatoSection ingredientIds={pending?.ingredients ?? []} />
      </div>

      <div className={styles.makeCtaWrap}>
        <DetailMakeCTA
          state={makeCtaState}
          heartFilled={saved.state === 'saved'}
          onMakeClick={() => void handleMakeClick()}
          onHeartClick={() => void handleHeart()}
          onSignInRequest={openModal}
        />
      </div>
    </div>
  );
}
