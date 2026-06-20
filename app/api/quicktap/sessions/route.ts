/**
 * POST /api/quicktap/sessions
 *
 * リクエストボディ (JSON):
 *   { localeId: string; ingredients: string[]; sessionId: string }
 *
 * レスポンス: NDJSON ストリーム (Content-Type: application/x-ndjson)
 *   - StreamEvent (src/domain/schemas.ts) を 1 行 1 JSON
 *   - session.start → 3 候補 × 7 イベント → session.done の合計 23 行
 *
 * 失敗:
 *   - 400 BAD_BODY: JSON parse 失敗 / Zod 検証失敗
 *   - 5xx INTERNAL_ERROR: Agent 例外
 */

import { z } from 'zod';

import { createAgentClient } from '@/lib/agent/factory';
import { parseJsonBody } from '@/lib/http/parse-body';
import { withAuthOptional } from '@/lib/http/with-auth';
import { withRateLimit } from '@/lib/http/with-rate-limit';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limit/limits';

const RequestBodySchema = z.object({
  localeId: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  sessionId: z.string().min(1),
});

// AGENT_MODE で MockAgentClient / HttpAgentClient を切替
const agent = createAgentClient();

export const dynamic = 'force-dynamic';

export const POST = withAuthOptional(
  withRateLimit(RATE_LIMIT_CONFIG['/api/quicktap/sessions'], async (request, ctx) => {
    const body = await parseJsonBody(request, RequestBodySchema);

    const stream = await agent.generateCandidates({
      localeId: body.localeId,
      ingredients: body.ingredients,
      ...(ctx.subject.kind === 'guest' && { guestSessionId: ctx.subject.guestSessionId }),
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
        'x-mlpr-session-id': body.sessionId,
      },
    });
  }),
);
