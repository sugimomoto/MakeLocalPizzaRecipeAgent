/**
 * POST /api/share
 *
 * Slice 10: 共有レシピを発行する。認証ユーザ / ゲスト両対応。
 *
 * Request body: ShareRequestSchema (詳細画面が持っている全フィールド)
 * Response: { shareId, url }
 *
 * 失敗:
 *   - 400 BAD_BODY        : JSON parse / Zod 失敗
 *   - 401 NO_OWNER        : auth uid も guest session id も無い (異常系)
 *   - 429                 : withRateLimit ミドルウェアにより
 *   - 500 SHARE_PERSIST_FAILED : Firestore 書込み失敗
 *
 * 認可:
 *   - 認証ユーザは存在しないので (Slice 4 未着手)、現状すべて
 *     `withAuthOptional` から返る `subject.kind === 'guest'` を所有者にする。
 *   - guest session id は `x-mlpr-guest-session-id` ヘッダ。client は `apiFetch` 経由で
 *     自動付与される。
 */

import { apiError } from '@/lib/http/error';
import { parseJsonBody } from '@/lib/http/parse-body';
import { withAuthOptional } from '@/lib/http/with-auth';
import { withRateLimit } from '@/lib/http/with-rate-limit';
import { logger } from '@/lib/observability/logger';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limit/limits';

import { ShareRequestSchema } from '@/domain/share';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { createSharedRecipe } from '@/lib/firebase/shared-recipe';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://furusato-pizza.jp';

export const dynamic = 'force-dynamic';

export const POST = withAuthOptional(
  withRateLimit(RATE_LIMIT_CONFIG['/api/share'], async (request, ctx) => {
    // 所有者識別。auth uid を取る経路は未整備なので guest セッション必須。
    if (ctx.subject.kind !== 'guest') {
      throw apiError.unauthorized('NO_OWNER', '共有を作成するにはゲストセッション ID が必要です');
    }
    const guestSessionId = ctx.subject.guestSessionId;

    const payload = await parseJsonBody(request, ShareRequestSchema, {
      invalidJsonMessage: 'JSON ボディが不正です',
      formatZodError: (error) => `ボディ検証エラー: ${error.message}`,
    });

    let result: { shareId: string; isNew: boolean };
    try {
      const adminDb = getAdminFirestore();
      result = await createSharedRecipe(adminDb, {
        owner: { kind: 'guest', guestSessionId },
        payload,
      });
    } catch (err) {
      logger.error('share_persist_failed', {
        candidateId: payload.candidateId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw apiError.internal(
        'SHARE_PERSIST_FAILED',
        '共有 URL の作成に失敗しました。しばらくしてから再度お試しください',
      );
    }

    const url = `${BASE_URL}/share/${result.shareId}`;
    logger.info('share_persisted', {
      shareId: result.shareId,
      candidateId: payload.candidateId,
      isNew: result.isNew,
    });
    return new Response(JSON.stringify({ shareId: result.shareId, url }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        ...(ctx.rateLimitRemaining !== undefined
          ? { 'x-ratelimit-remaining': String(ctx.rateLimitRemaining) }
          : {}),
      },
    });
  }),
);
