'use client';

/**
 * useFeedback — フィードバックの saved + draft を購読し、submit / discard を提供 (Slice 7)
 *
 * 状態 (state):
 *   loading           ← Auth status='loading' 中 / Firestore 初期化前
 *   unauthenticated   ← サインインしていない
 *   idle              ← 購読中、submit 可
 *
 * 初期表示用の `initial` は **saved > draft > empty** の優先順位で hydrate される。
 * - saved = users/{uid}/savedRecipes/{candidateId}.feedback (subscribe)
 * - draft = users/{uid}/drafts/{candidateId} (subscribe)
 */

import { useCallback, useEffect, useState } from 'react';

import {
  emptyFeedback,
  FEEDBACK_AXIS_ORDER,
  type Feedback,
  type FeedbackDraft,
  type FeedbackScore,
} from '@/domain/feedback';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseDb } from '@/lib/firebase/client';
import { deleteDraft, deleteFeedback, saveFeedback, subscribeDraft } from '@/lib/firebase/feedback';
import { subscribeSavedRecipe } from '@/lib/firebase/saved-recipe';

import type { SavedRecipe } from '@/domain/saved-recipe';

export type UseFeedbackState = 'loading' | 'unauthenticated' | 'idle';

/** Form value (cookedAt / updatedAt を持たない) */
export type FeedbackFormValue = Omit<Feedback, 'cookedAt' | 'updatedAt'>;

export type UseFeedbackResult = {
  state: UseFeedbackState;
  /** 既存 saved feedback (subscribe)。null=未保存 */
  saved: Feedback | null;
  /** draft (subscribe)。null=未着 or 削除済 */
  draft: FeedbackDraft | null;
  /** 親 SavedRecipe 全体 (Hero / 既存表示用)。null=未保存 */
  recipe: SavedRecipe | null;
  /** SavedRecipe subscribe の初回 snapshot が届いたか。recipe が null のときに
   *  「未受信 (subscribe 初期化中)」と「受信したが doc 不在 (= 未保存)」を区別する用。
   *  /feedback 側のリダイレクト判定で重要 (Slice 7 後追加)。 */
  recipeReady: boolean;
  /** 画面の初期値: saved > draft > empty */
  initial: FeedbackFormValue;
  /** submit (saveFeedback + draft 削除)。saved がなければ isFirst=true */
  save: (payload: FeedbackFormValue) => Promise<void>;
  /** フィードバックだけ削除 (SavedRecipe は残す)。Slice 7 後追加 */
  remove: () => Promise<void>;
  /** draft だけ手動破棄 (UI からは通常呼ばない、テスト / 緊急用) */
  discardDraft: () => Promise<void>;
  /** 直近のエラー (Toast 用) */
  error: Error | null;
};

function draftToForm(draft: FeedbackDraft): FeedbackFormValue {
  const base = emptyFeedback();
  return {
    overallRating: (draft.overallRating ?? base.overallRating) as FeedbackScore,
    axes: {
      taste: (draft.axes?.taste ?? 0) as FeedbackScore,
      look: (draft.axes?.look ?? 0) as FeedbackScore,
      story: (draft.axes?.story ?? 0) as FeedbackScore,
      again: (draft.axes?.again ?? 0) as FeedbackScore,
    },
    whatWorked: draft.whatWorked ?? base.whatWorked,
    whatToTune: draft.whatToTune ?? base.whatToTune,
    guestVibe: draft.guestVibe ?? base.guestVibe,
    guestCount: draft.guestCount ?? base.guestCount,
    ...(draft.note !== undefined ? { note: draft.note } : {}),
    ...(draft.photoUrl !== undefined ? { photoUrl: draft.photoUrl } : {}),
  };
}

function feedbackToForm(f: Feedback): FeedbackFormValue {
  return {
    overallRating: f.overallRating,
    axes: { taste: f.axes.taste, look: f.axes.look, story: f.axes.story, again: f.axes.again },
    whatWorked: [...f.whatWorked],
    whatToTune: [...f.whatToTune],
    guestVibe: [...f.guestVibe],
    guestCount: f.guestCount,
    ...(f.note !== undefined ? { note: f.note } : {}),
    ...(f.photoUrl !== undefined ? { photoUrl: f.photoUrl } : {}),
  };
}

export function useFeedback(candidateId: string): UseFeedbackResult {
  const { status, user } = useAuth();
  const [state, setState] = useState<UseFeedbackState>('loading');
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [recipeReady, setRecipeReady] = useState(false);
  const [draft, setDraft] = useState<FeedbackDraft | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);
    // candidateId / user 切替時は subscribe 初回 snapshot まで「未受信」扱い
    setRecipeReady(false);

    if (status === 'loading') {
      setState('loading');
      setRecipe(null);
      setDraft(null);
      return;
    }
    if (status === 'unauthenticated' || !user) {
      setState('unauthenticated');
      setRecipe(null);
      setDraft(null);
      return;
    }

    const db = getFirebaseDb();
    setState('idle');
    const unsubRecipe = subscribeSavedRecipe(
      db,
      user.uid,
      candidateId,
      (next) => {
        setRecipe(next);
        setRecipeReady(true);
      },
      (err) => setError(err),
    );
    const unsubDraft = subscribeDraft(
      db,
      user.uid,
      candidateId,
      (next) => setDraft(next),
      (err) => setError(err),
    );
    return () => {
      unsubRecipe();
      unsubDraft();
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [status, user, candidateId]);

  const save = useCallback(
    async (payload: FeedbackFormValue): Promise<void> => {
      if (!user) throw new Error('not authenticated');
      const isFirst = !recipe?.feedback;
      try {
        await saveFeedback(getFirebaseDb(), user.uid, candidateId, payload, { isFirst });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      }
    },
    [user, candidateId, recipe],
  );

  const remove = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('not authenticated');
    try {
      await deleteFeedback(getFirebaseDb(), user.uid, candidateId);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    }
  }, [user, candidateId]);

  const discardDraft = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      await deleteDraft(getFirebaseDb(), user.uid, candidateId);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
    }
  }, [user, candidateId]);

  const saved = recipe?.feedback ?? null;
  // initial: saved > draft > empty
  let initial: FeedbackFormValue;
  if (saved) initial = feedbackToForm(saved);
  else if (draft) initial = draftToForm(draft);
  else initial = { ...emptyFeedback() };

  // FEEDBACK_AXIS_ORDER は使うけど直接エクスポートはしない、参照確保
  void FEEDBACK_AXIS_ORDER;

  return {
    state,
    saved,
    draft,
    recipe,
    recipeReady,
    initial,
    save,
    remove,
    discardDraft,
    error,
  };
}
