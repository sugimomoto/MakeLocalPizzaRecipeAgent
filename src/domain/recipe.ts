/**
 * Recipe (詳細レシピ) ドメイン型 — Python 側 recipe.py と semantic 同期。
 *
 * Slice 3 で導入。Slice 2 の Candidate (3 案) に対し、ユーザが選んだ 1 案を
 * Gemini Flash で「材料・手順・ストーリー」まで展開した詳細出力を表す。
 *
 * - RecipeMaterial: 材料 1 行
 * - RecipeMeta: 詳細画面上部の俯瞰メタ (人数 / 所要 / 焼成温度 / 難易度)
 */

export type RecipeMaterial = {
  name: string;
  quantity: string;
};

export type RecipeMeta = {
  servings: string;
  duration: string;
  bakingTemp: string;
  difficulty: string;
};

export type RecipeStory = {
  eyebrow: string;
  headline: string;
  body: string;
};
