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

import { CandidateSchema } from '@/domain/candidate';
import { createAgentClient } from '@/lib/agent/factory';
import { apiError } from '@/lib/http/error';
import { parseJsonBody } from '@/lib/http/parse-body';
import { getPathParam } from '@/lib/http/path-param';
import { withAuthOptional } from '@/lib/http/with-auth';
import { withRateLimit } from '@/lib/http/with-rate-limit';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limit/limits';

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
  withRateLimit(RATE_LIMIT_CONFIG['/api/recipes/[candidateId]'], async (request, ctx) => {
    // /api/recipes/{candidateId} → segments[2]
    const candidateId = getPathParam(request, 2);
    if (!candidateId) {
      throw apiError.badRequest('BAD_REQUEST', 'candidate id is required');
    }

    const body = await parseJsonBody(request, RequestBodySchema);

    const stream = await agent.generateRecipeDetail({
      candidateId,
      localeId: body.localeId,
      ingredients: body.ingredients,
      candidate: body.candidate,
      ...(body.ovenProfile !== undefined && { ovenProfile: body.ovenProfile }),
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
  }),
);
