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
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export type StreamEventType = StreamEvent['type'];
