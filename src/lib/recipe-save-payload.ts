/**
 * buildSavePayload — 詳細画面のハート保存 / 「作ってみる」保存で書き込む
 * SavedRecipeSnapshot を組み立てる純粋関数。
 *
 * DetailClient の handleHeart / handleMakeClick で完全複製されていた約 20 行の
 * snapshot 構築 (候補スナップショット + 詳細スナップショットの conditional spread) を
 * 1 箇所に集約し、「片方だけ更新して取り違える」事故を防ぐ。
 */

import type { Candidate } from '@/domain/candidate';
import type { RecipeMaterial, RecipeMeta, RecipeStory } from '@/domain/recipe';
import type { SavedRecipeSnapshot } from '@/domain/saved-recipe';

/** 詳細ストリームから取り出す snapshot フィールド (まだ揃っていなければ null)。 */
export type RecipeDetailSnapshotFields = {
  imageUrl: string | null;
  meta: RecipeMeta | null;
  materials: RecipeMaterial[] | null;
  steps: string[] | null;
  story: RecipeStory | null;
};

export function buildSavePayload(params: {
  candidateId: string;
  title: string;
  localeId: string;
  prefecture: string;
  ingredients: string[];
  candidate: Candidate;
  detail: RecipeDetailSnapshotFields;
}): SavedRecipeSnapshot {
  const { candidateId, title, localeId, prefecture, ingredients, candidate, detail } = params;
  return {
    candidateId,
    title,
    localeId,
    prefecture,
    strategy: candidate.strategy,
    imageUrl: detail.imageUrl ?? '',
    ingredients,
    // 候補スナップショット
    concept: candidate.concept,
    keyIngredients: candidate.keyIngredients,
    sceneTags: candidate.sceneTags,
    why: candidate.why,
    // 詳細スナップショット (recipeDone まで揃ったフィールドのみ条件付きで含める)
    ...(detail.meta && { meta: detail.meta }),
    ...(detail.materials && { materials: detail.materials }),
    ...(detail.steps && { steps: detail.steps }),
    ...(detail.story && { story: detail.story }),
  };
}
