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

/**
 * /candidates/[sessionId] の生成結果キャッシュ (Slice 7 リロード対策)。
 *
 * フルキー: `mlpr.cache.candidates.v1::{sessionId}`
 * payload: `{ candidates: PartialCandidate[] }` (3 案、全 isDone)
 *
 * リロード時に再生成 (Vertex AI 呼び出し) を回避するため、stream が `done`
 * 状態に到達したタイミングで sessionStorage に書き込む。タブを閉じたら
 * 自然に消える = 新しいセッションでは再生成される。
 *
 * 「ふり直す」CTA は明示的に再生成する意図なので、押下時にこのキーを削除。
 */
export const CANDIDATES_CACHE_PREFIX = 'mlpr.cache.candidates.v1::';

/**
 * /recipes/[candidateId] の生成結果キャッシュ (Slice 7 リロード対策)。
 *
 * フルキー: `mlpr.cache.recipe.v1::{candidateId}`
 * payload: HydrateSnapshot (title / meta / materials / steps / story / imageUrl)
 *
 * リロード時に再生成 (Vertex AI + Imagen 呼び出し) を回避するため、stream が
 * `allDone` 状態に到達したタイミングで sessionStorage に書き込む。
 */
export const RECIPE_CACHE_PREFIX = 'mlpr.cache.recipe.v1::';
