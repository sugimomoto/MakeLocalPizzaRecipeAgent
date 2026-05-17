/**
 * NDJSON ストリーム契約の Zod スキーマ。
 *
 * 設計:
 * - 個別のイベントスキーマを定数として宣言する (型 narrowing 用)
 * - 3 つの sub-union を export してハンドラ側でスーパーセットを subscribe しない
 *   - `CandidateStreamEventSchema` … POST /api/quicktap/sessions (+ reroll) が返す
 *   - `RecipeDetailStreamEventSchema` … POST /api/recipes/[id] が返す
 *   - `StreamEventSchema` … 全イベント (encoder 用 / 後方互換)
 *
 * 受信側 (use-quicktap-stream / use-recipe-detail-stream) は、自分が subscribe
 * したい sub-union のスキーマを `decodeNdjsonStream` に渡すことで、switch case の
 * fallthrough (recipe.* を candidate stream で握りつぶす等) が型レベルで消える。
 */

import { z } from 'zod';

const strategyEnum = z.enum(['exploit', 'tune', 'explore']);

const recipeMaterialSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1),
});

const recipeMetaSchema = z.object({
  servings: z.string().min(1),
  duration: z.string().min(1),
  bakingTemp: z.string().min(1),
  difficulty: z.string().min(1),
});

// ----- 共通 (どのストリームにも出現しうる) -----------------------------------

const errorEventSchema = z.object({
  type: z.literal('error'),
  code: z.string().min(1),
  message: z.string().min(1),
});

// ----- 候補ストリーム (session.* + candidate.*) ------------------------------

const sessionStartSchema = z.object({
  type: z.literal('session.start'),
  sessionId: z.string().min(1),
  strategies: z.array(strategyEnum).min(1),
});

const sessionDoneSchema = z.object({
  type: z.literal('session.done'),
  sessionId: z.string().min(1),
});

const candidateStartSchema = z.object({
  type: z.literal('candidate.start'),
  strategy: strategyEnum,
  candidateId: z.string().min(1),
});

const candidateTitleSchema = z.object({
  type: z.literal('candidate.title'),
  candidateId: z.string().min(1),
  title: z.string().min(1),
});

const candidateConceptSchema = z.object({
  type: z.literal('candidate.concept'),
  candidateId: z.string().min(1),
  concept: z.string().min(1),
});

const candidateIngredientsSchema = z.object({
  type: z.literal('candidate.ingredients'),
  candidateId: z.string().min(1),
  ingredients: z.array(z.string().min(1)),
});

const candidateSceneTagsSchema = z.object({
  type: z.literal('candidate.sceneTags'),
  candidateId: z.string().min(1),
  sceneTags: z.array(z.string().min(1)),
});

const candidateWhySchema = z.object({
  type: z.literal('candidate.why'),
  candidateId: z.string().min(1),
  why: z.string().min(1),
});

const candidateDoneSchema = z.object({
  type: z.literal('candidate.done'),
  candidateId: z.string().min(1),
});

// ----- 詳細レシピストリーム (recipe.* + image.*) ----------------------------

const recipeStartSchema = z.object({
  type: z.literal('recipe.start'),
  recipeId: z.string().min(1),
});

const recipeTitleSchema = z.object({
  type: z.literal('recipe.title'),
  recipeId: z.string().min(1),
  title: z.string().min(1),
});

const recipeMetaEventSchema = z.object({
  type: z.literal('recipe.meta'),
  recipeId: z.string().min(1),
  meta: recipeMetaSchema,
});

const recipeMaterialsSchema = z.object({
  type: z.literal('recipe.materials'),
  recipeId: z.string().min(1),
  materials: z.array(recipeMaterialSchema).min(1),
});

const recipeStepsSchema = z.object({
  type: z.literal('recipe.steps'),
  recipeId: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
});

const recipeStorySchema = z.object({
  type: z.literal('recipe.story'),
  recipeId: z.string().min(1),
  eyebrow: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
});

const recipeDoneSchema = z.object({
  type: z.literal('recipe.done'),
  recipeId: z.string().min(1),
});

const imageStartSchema = z.object({
  type: z.literal('image.start'),
  recipeId: z.string().min(1),
});

const imageReadySchema = z.object({
  type: z.literal('image.ready'),
  recipeId: z.string().min(1),
  dataUri: z.string().min(1),
});

const imageErrorSchema = z.object({
  type: z.literal('image.error'),
  recipeId: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
});

// ----- Public sub-unions -----------------------------------------------------

/** /api/quicktap/sessions (+ reroll) が返す 10 種類のイベント。 */
export const CandidateStreamEventSchema = z.discriminatedUnion('type', [
  sessionStartSchema,
  sessionDoneSchema,
  candidateStartSchema,
  candidateTitleSchema,
  candidateConceptSchema,
  candidateIngredientsSchema,
  candidateSceneTagsSchema,
  candidateWhySchema,
  candidateDoneSchema,
  errorEventSchema,
]);
export type CandidateStreamEvent = z.infer<typeof CandidateStreamEventSchema>;

/** /api/recipes/[id] が返す 10 種類のイベント (recipe.* + image.* + error)。 */
export const RecipeDetailStreamEventSchema = z.discriminatedUnion('type', [
  recipeStartSchema,
  recipeTitleSchema,
  recipeMetaEventSchema,
  recipeMaterialsSchema,
  recipeStepsSchema,
  recipeStorySchema,
  recipeDoneSchema,
  imageStartSchema,
  imageReadySchema,
  imageErrorSchema,
  errorEventSchema,
]);
export type RecipeDetailStreamEvent = z.infer<typeof RecipeDetailStreamEventSchema>;

/**
 * 全 19 種類のイベント (encoder 用 + 後方互換)。
 *
 * NDJSON encoder (`encodeNdjsonStream`) や、ストリームの種別を判別せず
 * 検証だけしたい箇所はこちらを使う。新しいコードでは sub-union を優先。
 */
export const StreamEventSchema = z.discriminatedUnion('type', [
  sessionStartSchema,
  sessionDoneSchema,
  candidateStartSchema,
  candidateTitleSchema,
  candidateConceptSchema,
  candidateIngredientsSchema,
  candidateSceneTagsSchema,
  candidateWhySchema,
  candidateDoneSchema,
  errorEventSchema,
  recipeStartSchema,
  recipeTitleSchema,
  recipeMetaEventSchema,
  recipeMaterialsSchema,
  recipeStepsSchema,
  recipeStorySchema,
  recipeDoneSchema,
  imageStartSchema,
  imageReadySchema,
  imageErrorSchema,
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export type StreamEventType = StreamEvent['type'];
