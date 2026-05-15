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

import { MockAgentClient } from '@/lib/agent/mock-candidates';
import { apiError } from '@/lib/http/error';
import { withAuthOptional } from '@/lib/http/with-auth';

const RequestBodySchema = z.object({
  localeId: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  sessionId: z.string().min(1),
});

const agent = new MockAgentClient(
  process.env.NODE_ENV === 'test' ? { delayRange: { min: 0, max: 0 } } : {},
);

export const dynamic = 'force-dynamic';

export const POST = withAuthOptional(async (request, ctx) => {
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

  const stream = await agent.generateCandidates({
    localeId: parsed.data.localeId,
    ingredients: parsed.data.ingredients,
    ...(ctx.subject.kind === 'guest' && { guestSessionId: ctx.subject.guestSessionId }),
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-mlpr-session-id': parsed.data.sessionId,
    },
  });
});
