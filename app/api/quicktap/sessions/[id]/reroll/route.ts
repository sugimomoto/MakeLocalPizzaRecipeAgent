/**
 * POST /api/quicktap/sessions/[id]/reroll
 *
 * 既存セッション ID を渡すと、別 seed で 3 候補を再生成。
 * リクエストボディは不要。
 *
 * レスポンス: NDJSON ストリーム (Content-Type: application/x-ndjson)
 *   - 元の sessionId とは異なる sessionId を持つ session.start から始まる新ストリーム
 *
 * 失敗:
 *   - 400 BAD_REQUEST: パスから session id が取れない
 */

import { MockAgentClient } from '@/lib/agent/mock-candidates';
import { apiError } from '@/lib/http/error';
import { withAuthOptional } from '@/lib/http/with-auth';

const agent = new MockAgentClient(
  process.env.NODE_ENV === 'test' ? { delayRange: { min: 0, max: 0 } } : {},
);

export const dynamic = 'force-dynamic';

export const POST = withAuthOptional(async (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // /api/quicktap/sessions/{id}/reroll → segments[3] が id
  const sessionId = segments[3];

  if (!sessionId) {
    throw apiError.badRequest('BAD_REQUEST', 'session id is required');
  }

  const stream = await agent.reroll(sessionId);

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-mlpr-source-session-id': sessionId,
    },
  });
});
