/**
 * GET /api/health — 死活確認エンドポイント。
 * Cloud Run のヘルスチェック・smoke test 用。
 */

import { withAuthOptional } from '@/lib/http/with-auth';

export const dynamic = 'force-dynamic';

export const GET = withAuthOptional(async () => {
  return Response.json({ ok: true });
});
