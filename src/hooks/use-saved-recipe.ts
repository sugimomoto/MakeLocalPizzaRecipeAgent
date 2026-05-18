'use client';

/**
 * useSavedRecipe — 1 件のレシピが「ピザ帳」に保存済みかを購読 + save/unsave 関数。
 *
 * 状態遷移:
 *   loading           ← 初期 / Auth status='loading'
 *   unauthenticated   ← Auth status='unauthenticated' (Firestore は触らない)
 *   unsaved           ← サインイン済 + Firestore doc が存在しない
 *   saved             ← サインイン済 + Firestore doc が存在する
 *
 * save() / unsave() を呼び出すとそれぞれ Firestore に setDoc / deleteDoc し、
 * onSnapshot で state が再評価される。未サインイン時に save()/unsave() を呼ぶと
 * Error を投げる (呼び出し側は state を確認してから呼ぶこと)。
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getFirebaseDb } from '@/lib/firebase/client';
import { saveRecipe, subscribeSavedRecipe, unsaveRecipe } from '@/lib/firebase/saved-recipe';

import type { SavedRecipe, SavedRecipeSnapshot } from '@/domain/saved-recipe';

export type SavedRecipeState = 'loading' | 'unsaved' | 'saved' | 'unauthenticated';

export type UseSavedRecipeResult = {
  state: SavedRecipeState;
  /** state==='saved' のときだけ非 null */
  recipe: SavedRecipe | null;
  /** 直近の Firestore 操作 / 購読のエラー (UI で warning Toast 用) */
  error: Error | null;
  save: (snapshot: SavedRecipeSnapshot) => Promise<void>;
  unsave: () => Promise<void>;
};

export function useSavedRecipe(candidateId: string): UseSavedRecipeResult {
  const { status, user } = useAuth();
  const [state, setState] = useState<SavedRecipeState>('loading');
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 入力 (status / user) の変化に応じて状態を再評価する純粋な同期処理。
    // React 19 の `set-state-in-effect` 警告は invariant 維持目的なので
    // ここでは意図通り disable する (subscribe の lifecycle と setState を
    // 同じ effect に閉じ込めるのが最も読みやすい)。
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);

    if (status === 'loading') {
      setState('loading');
      setRecipe(null);
      return;
    }
    if (status === 'unauthenticated' || !user) {
      setState('unauthenticated');
      setRecipe(null);
      return;
    }

    const db = getFirebaseDb();
    const unsub = subscribeSavedRecipe(
      db,
      user.uid,
      candidateId,
      (next) => {
        setRecipe(next);
        setState(next ? 'saved' : 'unsaved');
      },
      (err) => {
        setError(err);
      },
    );
    return unsub;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [status, user, candidateId]);

  const save = useCallback(
    async (snapshot: SavedRecipeSnapshot): Promise<void> => {
      if (!user) throw new Error('not authenticated');
      try {
        await saveRecipe(getFirebaseDb(), user.uid, snapshot);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      }
    },
    [user],
  );

  const unsave = useCallback(async (): Promise<void> => {
    if (!user) throw new Error('not authenticated');
    try {
      await unsaveRecipe(getFirebaseDb(), user.uid, candidateId);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    }
  }, [user, candidateId]);

  return { state, recipe, error, save, unsave };
}
