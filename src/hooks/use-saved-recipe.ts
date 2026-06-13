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
import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  useFirestoreSubscription,
  type FirestoreSubscribeFn,
} from '@/hooks/use-firestore-subscription';
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
  const { user } = useAuth();
  // 操作 (save/unsave) 起因のエラー。購読エラー (subError) とは別管理し、return 時に統合する。
  const [opError, setOpError] = useState<Error | null>(null);

  const subscribe = useCallback<FirestoreSubscribeFn<SavedRecipe | null>>(
    (db, uid, onData, onError) => subscribeSavedRecipe(db, uid, candidateId, onData, onError),
    [candidateId],
  );
  const { status, data: recipe, error: subError } = useFirestoreSubscription(subscribe);

  const state: SavedRecipeState = status === 'ready' ? (recipe ? 'saved' : 'unsaved') : status;

  const save = useCallback(
    async (snapshot: SavedRecipeSnapshot): Promise<void> => {
      if (!user) throw new Error('not authenticated');
      try {
        await saveRecipe(getFirebaseDb(), user.uid, snapshot);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setOpError(e);
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
      setOpError(e);
      throw e;
    }
  }, [user, candidateId]);

  return { state, recipe, error: opError ?? subError, save, unsave };
}
