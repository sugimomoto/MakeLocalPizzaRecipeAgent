'use client';

/**
 * useSavedRecipes — `users/{uid}/savedRecipes` の一覧を `savedAt` 降順で購読する。
 *
 * 状態:
 *   { state: 'loading',         items: null }  ← Auth status='loading'
 *   { state: 'unauthenticated', items: null }  ← Auth status='unauthenticated'
 *   { state: 'ready',           items: [...] } ← Firestore から取得 (空配列もここ)
 *
 * `error` は購読中に発生した Firestore エラー (warning Toast 等で扱う)。
 *
 * /library 画面 (Phase 9) で使う。
 */
import { useCallback } from 'react';

import {
  useFirestoreSubscription,
  type FirestoreSubscribeFn,
} from '@/hooks/use-firestore-subscription';
import { subscribeSavedRecipes } from '@/lib/firebase/saved-recipe';

import type { SavedRecipe } from '@/domain/saved-recipe';

export type SavedRecipesState = 'loading' | 'unauthenticated' | 'ready';

export type UseSavedRecipesResult = {
  state: SavedRecipesState;
  items: SavedRecipe[] | null;
  error: Error | null;
};

export function useSavedRecipes(): UseSavedRecipesResult {
  const subscribe = useCallback<FirestoreSubscribeFn<SavedRecipe[]>>(
    (db, uid, onData, onError) => subscribeSavedRecipes(db, uid, onData, onError),
    [],
  );
  const { status, data, error } = useFirestoreSubscription(subscribe);
  return { state: status, items: data, error };
}
