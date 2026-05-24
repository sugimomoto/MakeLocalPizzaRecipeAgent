'use client';

/**
 * useSavedRecipesJournal — saved recipes のうち feedback がある items だけを
 * 振り返り帳用に抽出 + cookedAt 降順で再ソート (Slice 7)
 *
 * 既存 useSavedRecipes をラップ。生 items から hasFeedback() でフィルタし、
 * feedback.cookedAt の Date を比較して新しい順に並べ替え。
 */

import { useMemo } from 'react';

import { hasFeedback, type SavedRecipe } from '@/domain/saved-recipe';

import { useSavedRecipes, type SavedRecipesState } from './use-saved-recipes';

export type UseSavedRecipesJournalResult = {
  state: SavedRecipesState;
  /** state==='ready' のときだけ非 null。feedback あり + cookedAt 降順 */
  items: SavedRecipe[] | null;
  error: Error | null;
};

export function useSavedRecipesJournal(): UseSavedRecipesJournalResult {
  const { state, items, error } = useSavedRecipes();
  const filtered = useMemo(() => {
    if (!items) return null;
    const onlyWithFeedback = items.filter((r) => hasFeedback(r));
    onlyWithFeedback.sort((a, b) => {
      const at = a.feedback?.cookedAt?.getTime() ?? 0;
      const bt = b.feedback?.cookedAt?.getTime() ?? 0;
      return bt - at;
    });
    return onlyWithFeedback;
  }, [items]);

  return { state, items: filtered, error };
}
