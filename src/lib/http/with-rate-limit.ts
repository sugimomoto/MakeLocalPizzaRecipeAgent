/**
 * withRateLimit — レートリミット middleware HOF (Slice 9)
 *
 * `withAuthOptional` の内側にネストして使う:
 *
 *   export const POST = withAuthOptional(
 *     withRateLimit(
 *       { limit: 5, routeKey: '/api/recipes/[candidateId]' },
 *       async (request, ctx) => { ... },
 *     ),
 *   );
 *
 * 上限超過時はハンドラを **呼ばずに** 429 を即座に返すため、Vertex AI 等の
 * 課金リクエストは発生しない (= ボット保護の本丸)。
 *
 * 設計詳細: design.md §3
 */

import { logger } from '@/lib/observability/logger';
import { hourBucket } from '@/lib/rate-limit/bucket';
import { resolveRateLimitKey } from '@/lib/rate-limit/key';
import { getRateLimitStore, type RateLimitStore } from '@/lib/rate-limit/store';

import type { AuthedHandler } from './with-auth';
import type { RateLimitRouteKey } from '@/lib/rate-limit/types';

export type WithRateLimitConfig = {
  /** 1 hour あたり最大件数 */
  limit: number;
  /** route 識別子 (Firestore doc / log で利用) */
  routeKey: RateLimitRouteKey;
  /** テスト用: Store の注入 (省略時は selector を使う) */
  store?: RateLimitStore;
  /** テスト用: 時刻供給 */
  now?: () => Date;
};

export function withRateLimit(
  config: WithRateLimitConfig,
  handler: AuthedHandler<Response>,
): AuthedHandler<Response> {
  return async (request, ctx) => {
    const store = config.store ?? getRateLimitStore();
    const now = (config.now ?? (() => new Date()))();
    const key = resolveRateLimitKey(request, ctx.subject);
    const bucket = hourBucket(now);

    const decision = await store.tryConsume({
      bucket,
      key,
      routeKey: config.routeKey,
      limit: config.limit,
      now,
    });

    if (!decision.allowed) {
      logger.warn('rate_limited', {
        routeKey: config.routeKey,
        keyKind: key.kind,
        bucket,
        limit: config.limit,
        retryAfterSeconds: decision.retryAfterSeconds,
      });

      const body = JSON.stringify({
        error: {
          code: 'RATE_LIMITED',
          message: 'しばらく時間をおいてから再度お試しください',
          retryAfter: decision.retryAfterSeconds,
        },
      });

      return new Response(body, {
        status: 429,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'retry-after': String(decision.retryAfterSeconds),
          'x-ratelimit-limit': String(config.limit),
          'x-ratelimit-remaining': '0',
        },
      });
    }

    // 200 経路: 残り回数を ctx に載せる (handler は任意で利用)
    ctx.rateLimitRemaining = decision.remaining;
    return handler(request, ctx);
  };
}
