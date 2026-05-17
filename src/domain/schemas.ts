/**
 * NDJSON ストリーム契約の Zod スキーマ。
 *
 * `POST /api/quicktap/sessions` のレスポンスは 1 行 1 JSON、
 * Content-Type: application/x-ndjson。
 * 各行は StreamEvent (discriminated union) のいずれか。
 *
 * 受信側 (use-quicktap-stream.ts) で各行を JSON.parse してから
 * StreamEventSchema.safeParse() でバリデートする。
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

export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session.start'),
    sessionId: z.string().min(1),
    strategies: z.array(strategyEnum).min(1),
  }),
  z.object({
    type: z.literal('candidate.start'),
    strategy: strategyEnum,
    candidateId: z.string().min(1),
  }),
  z.object({
    type: z.literal('candidate.title'),
    candidateId: z.string().min(1),
    title: z.string().min(1),
  }),
  z.object({
    type: z.literal('candidate.concept'),
    candidateId: z.string().min(1),
    concept: z.string().min(1),
  }),
  z.object({
    type: z.literal('candidate.ingredients'),
    candidateId: z.string().min(1),
    ingredients: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('candidate.sceneTags'),
    candidateId: z.string().min(1),
    sceneTags: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('candidate.why'),
    candidateId: z.string().min(1),
    why: z.string().min(1),
  }),
  z.object({
    type: z.literal('candidate.done'),
    candidateId: z.string().min(1),
  }),
  z.object({
    type: z.literal('session.done'),
    sessionId: z.string().min(1),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
  // ----- Slice 3: 詳細レシピ (recipe.*) -------------------------------------
  z.object({
    type: z.literal('recipe.start'),
    recipeId: z.string().min(1),
  }),
  z.object({
    type: z.literal('recipe.title'),
    recipeId: z.string().min(1),
    title: z.string().min(1),
  }),
  z.object({
    type: z.literal('recipe.meta'),
    recipeId: z.string().min(1),
    meta: recipeMetaSchema,
  }),
  z.object({
    type: z.literal('recipe.materials'),
    recipeId: z.string().min(1),
    materials: z.array(recipeMaterialSchema).min(1),
  }),
  z.object({
    type: z.literal('recipe.steps'),
    recipeId: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('recipe.story'),
    recipeId: z.string().min(1),
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
    body: z.string().min(1),
  }),
  z.object({
    type: z.literal('recipe.done'),
    recipeId: z.string().min(1),
  }),
  // ----- Slice 3: 画像生成 (image.*) ---------------------------------------
  z.object({
    type: z.literal('image.start'),
    recipeId: z.string().min(1),
  }),
  z.object({
    type: z.literal('image.ready'),
    recipeId: z.string().min(1),
    dataUri: z.string().min(1),
  }),
  z.object({
    type: z.literal('image.error'),
    recipeId: z.string().min(1),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export type StreamEventType = StreamEvent['type'];
