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
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getFirebaseDb } from '@/lib/firebase/client';
import { subscribeSavedRecipes } from '@/lib/firebase/saved-recipe';

import type { SavedRecipe } from '@/domain/saved-recipe';

export type SavedRecipesState = 'loading' | 'unauthenticated' | 'ready';

export type UseSavedRecipesResult = {
  state: SavedRecipesState;
  items: SavedRecipe[] | null;
  error: Error | null;
};

export function useSavedRecipes(): UseSavedRecipesResult {
  const { status, user } = useAuth();
  const [state, setState] = useState<SavedRecipesState>('loading');
  const [items, setItems] = useState<SavedRecipe[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);

    if (status === 'loading') {
      setState('loading');
      setItems(null);
      return;
    }
    if (status === 'unauthenticated' || !user) {
      setState('unauthenticated');
      setItems(null);
      return;
    }

    const db = getFirebaseDb();
    const unsub = subscribeSavedRecipes(
      db,
      user.uid,
      (next) => {
        setItems(next);
        setState('ready');
      },
      (err) => {
        setError(err);
      },
    );
    return unsub;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [status, user]);

  return { state, items, error };
}
