/**
 * POST /api/recipes/[candidateId]
 *
 * Slice 3: 詳細レシピ + Imagen 画像生成。Agent (mock / http) の NDJSON を
 * そのまま pass-through する。リクエストボディ:
 *   { localeId: string; ingredients: string[]; candidate: Candidate }
 *
 * レスポンス: NDJSON ストリーム (Content-Type: application/x-ndjson)
 *   - recipe.start / image.start から始まり、最大 9 イベント
 *
 * 失敗:
 *   - 400 BAD_BODY: JSON parse / Zod 失敗
 *   - 400 BAD_REQUEST: path から candidateId が取れない
 */

import { z } from 'zod';

import { createAgentClient } from '@/lib/agent/factory';
import { apiError } from '@/lib/http/error';
import { withAuthOptional } from '@/lib/http/with-auth';
import { withRateLimit } from '@/lib/http/with-rate-limit';
import { RATE_LIMITS } from '@/lib/rate-limit/limits';

const CandidateSchema = z.object({
  candidateId: z.string().min(1),
  strategy: z.enum(['exploit', 'tune', 'explore']),
  title: z.string().min(1),
  concept: z.string().min(1),
  keyIngredients: z.array(z.string().min(1)).min(1),
  sceneTags: z.array(z.string().min(1)),
  why: z.string().min(1),
});

const RequestBodySchema = z.object({
  localeId: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  candidate: CandidateSchema,
  // Slice 8: 機材プロファイル ID (省略可、未知 ID は agent 側でデフォルトに丸める)
  ovenProfile: z.enum(['enro_450c_90s', 'home_oven_280c_10m']).optional(),
});

const agent = createAgentClient();

export const dynamic = 'force-dynamic';

export const POST = withAuthOptional(
  withRateLimit(
    {
      limit: RATE_LIMITS['/api/recipes/[candidateId]'],
      routeKey: '/api/recipes/[candidateId]',
    },
    async (request, ctx) => {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean);
      // /api/recipes/{candidateId} → segments[2]
      const candidateId = segments[2];
      if (!candidateId) {
        throw apiError.badRequest('BAD_REQUEST', 'candidate id is required');
      }

      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        throw apiError.badRequest('BAD_BODY', 'request body must be valid JSON');
      }
      const parsed = RequestBodySchema.safeParse(raw);
      if (!parsed.success) {
        throw apiError.badRequest('BAD_BODY', parsed.error.issues.map((i) => i.message).join('; '));
      }

      const stream = await agent.generateRecipeDetail({
        candidateId,
        localeId: parsed.data.localeId,
        ingredients: parsed.data.ingredients,
        candidate: parsed.data.candidate,
        ...(parsed.data.ovenProfile !== undefined && { ovenProfile: parsed.data.ovenProfile }),
        ...(ctx.subject.kind === 'guest' && { guestSessionId: ctx.subject.guestSessionId }),
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-store',
          'x-mlpr-recipe-id': decodeURIComponent(candidateId),
        },
      });
    },
  ),
);
