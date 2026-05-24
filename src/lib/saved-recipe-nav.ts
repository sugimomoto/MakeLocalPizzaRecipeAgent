/**
 * SavedRecipe → /recipes/[candidateId] への遷移時に sessionStorage へ書き出す
 * `PENDING_RECIPE_KEY` ペイロードのヘルパー (Slice 7 で /journal と /library から共用)。
 *
 * 元は LibraryClient 内ローカル関数 (Slice 6) だったが、Slice 7 で /journal も
 * 同じパス (saved snapshot から DetailClient を hydrate する) を踏むため
 * src/lib に切り出した。
 */

import { PENDING_RECIPE_KEY } from './storage-keys';

import type { SavedRecipe } from '@/domain/saved-recipe';

export function writePendingRecipeFromSaved(recipe: SavedRecipe): void {
  if (typeof window === 'undefined') return;
  const payload = {
    candidateId: recipe.candidateId,
    localeId: recipe.localeId,
    ingredients: recipe.ingredients ?? [],
    candidate: {
      candidateId: recipe.candidateId,
      strategy: recipe.strategy,
      title: recipe.title,
      // Slice 6 で candidate snapshot を SavedRecipe に追加。
      // 旧 doc (snapshot 無し) は空文字 / 空配列で fall back。
      concept: recipe.concept ?? '',
      keyIngredients: recipe.keyIngredients ?? [],
      sceneTags: recipe.sceneTags ?? [],
      why: recipe.why ?? '',
    },
    // Slice 6: detail snapshot を sessionStorage 経由で DetailClient に渡す。
    // hydrate に必要な 4 フィールドが揃っているときだけ savedSnapshot を入れる
    // (揃っていない旧 doc では DetailClient が再生成パスにフォールバック)。
    savedSnapshot:
      recipe.meta && recipe.materials && recipe.steps && recipe.story
        ? {
            meta: recipe.meta,
            materials: recipe.materials,
            steps: recipe.steps,
            story: recipe.story,
            imageUrl: recipe.imageUrl,
          }
        : undefined,
  };
  window.sessionStorage.setItem(PENDING_RECIPE_KEY, JSON.stringify(payload));
}
