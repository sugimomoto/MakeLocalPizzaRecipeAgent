/**
 * sessionStorage / localStorage で使うキーの集約。
 *
 * ルートをまたいで `app/.../route1` が `app/.../route2/_components/X` の export を
 * 相対 import するのを避けるため、ここに 1 箇所に集める。
 *
 * 命名規則:
 *   - prefix `mlpr.` (アプリ名)
 *   - 末尾 `.v1` (将来のスキーマ変更でバージョン切替できるように)
 */

/**
 * /ingredients → /candidates 遷移時の中継データ。
 *
 * payload: `{ sessionId, localeId, ingredients }`
 *
 * 書き手: `IngredientSelectClient` の「AIに 3 案つくらせる ✦」CTA
 * 読み手: `CandidatesClient` (3 案ストリーム起動 + reroll コンテキスト)
 */
export const PENDING_SESSION_KEY = 'mlpr.pendingSession.v1';

/**
 * /candidates → /recipes/[id] 遷移時の中継データ。
 *
 * payload: `{ candidateId, localeId, ingredients, candidate }`
 *
 * 書き手: `CandidatesClient` の「「<title>」に決める →」CTA
 * 読み手: `DetailClient` (詳細レシピストリーム起動)
 *
 * Slice 4 で Firestore に candidate を保存した後は不要になる予定 (candidateId
 * だけで取り回せる)。
 */
export const PENDING_RECIPE_KEY = 'mlpr.pendingRecipe.v1';
