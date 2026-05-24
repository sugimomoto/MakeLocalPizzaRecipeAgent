/**
 * POST /api/quicktap/sessions/[id]/reroll
 *
 * 既存セッション ID を渡すと、別 seed で 3 候補を再生成。
 *
 * リクエストボディ (Slice 7 で context 必須化):
 *   - localeId: 都道府県 ID
 *   - ingredients: 選択中の食材 ID 配列
 *
 * 旧仕様は server in-memory cache に依存していたため Cloud Run マルチ
 * インスタンスや Next.js HMR 再起動で 500 になっていた (Slice 7 で修正)。
 *
 * レスポンス: NDJSON ストリーム (Content-Type: application/x-ndjson)
 *   - 元の sessionId とは異なる sessionId を持つ session.start から始まる新ストリーム
 *
 * 失敗:
 *   - 400 BAD_REQUEST: パスから session id が取れない、または body が不正
 */

import { z } from 'zod';

import { createAgentClient } from '@/lib/agent/factory';
import { apiError } from '@/lib/http/error';
import { withAuthOptional } from '@/lib/http/with-auth';

// AGENT_MODE で MockAgentClient / HttpAgentClient を切替
const agent = createAgentClient();

export const dynamic = 'force-dynamic';

const RerollBodySchema = z.object({
  localeId: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
});

export const POST = withAuthOptional(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // /api/quicktap/sessions/{id}/reroll → segments[3] が id
  const sessionId = segments[3];

  if (!sessionId) {
    throw apiError.badRequest('BAD_REQUEST', 'session id is required');
  }

  let payload: z.infer<typeof RerollBodySchema>;
  try {
    const json = (await request.json()) as unknown;
    payload = RerollBodySchema.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'invalid body';
    throw apiError.badRequest('BAD_REQUEST', `reroll body invalid: ${message}`);
  }

  const stream = await agent.reroll({
    sourceSessionId: sessionId,
    localeId: payload.localeId,
    ingredients: payload.ingredients,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-mlpr-source-session-id': sessionId,
    },
  });
});
