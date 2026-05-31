import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemoryRateLimitStore } from '@/lib/rate-limit/store';

import { withRateLimit } from './with-rate-limit';

import type { AuthedHandler, AuthedRequestContext } from './with-auth';
import type { RateLimitRouteKey } from '@/lib/rate-limit/types';

const FIXED_NOW = new Date('2026-05-30T15:00:00Z');
const ROUTE: RateLimitRouteKey = '/api/recipes/[candidateId]';

function makeCtx(subject: AuthedRequestContext['subject']): AuthedRequestContext {
  return { subject };
}

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/recipes/abc', {
    method: 'POST',
    headers,
  });
}

const okHandler: AuthedHandler<Response> = async (_req, ctx) =>
  new Response(JSON.stringify({ ok: true, remaining: ctx.rateLimitRemaining }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('withRateLimit', () => {
  let store: MemoryRateLimitStore;
  const now = () => FIXED_NOW;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  it('passes through requests under the limit and sets ctx.rateLimitRemaining', async () => {
    const handler = withRateLimit({ limit: 3, routeKey: ROUTE, store, now }, okHandler);
    const res = await handler(
      makeReq({ 'x-mlpr-guest-session-id': 'g-1' }),
      makeCtx({ kind: 'guest', guestSessionId: 'g-1' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.remaining).toBe(2);
  });

  it('returns 429 with Retry-After once limit is exceeded', async () => {
    const handler = withRateLimit({ limit: 2, routeKey: ROUTE, store, now }, okHandler);
    const ctx = makeCtx({ kind: 'guest', guestSessionId: 'g-1' });

    await handler(makeReq(), ctx); // 1
    await handler(makeReq(), ctx); // 2
    const res = await handler(makeReq(), ctx); // 3 → 429

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('3600');
    expect(res.headers.get('x-ratelimit-limit')).toBe('2');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');

    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.retryAfter).toBe(3600);
    expect(typeof body.error.message).toBe('string');
  });

  it('does NOT invoke the inner handler when rate-limited', async () => {
    const inner = vi.fn(okHandler);
    const handler = withRateLimit({ limit: 1, routeKey: ROUTE, store, now }, inner);
    const ctx = makeCtx({ kind: 'guest', guestSessionId: 'g-1' });

    await handler(makeReq(), ctx); // 1
    const res = await handler(makeReq(), ctx); // 2 → 429
    expect(res.status).toBe(429);
    expect(inner).toHaveBeenCalledTimes(1); // 1 件目だけ呼ばれた
  });

  it('counts separately per key (same route)', async () => {
    const handler = withRateLimit({ limit: 1, routeKey: ROUTE, store, now }, okHandler);
    const ctxA = makeCtx({ kind: 'guest', guestSessionId: 'g-A' });
    const ctxB = makeCtx({ kind: 'guest', guestSessionId: 'g-B' });

    await handler(makeReq(), ctxA);
    const resA = await handler(makeReq(), ctxA); // 429
    const resB = await handler(makeReq(), ctxB); // 200 (別 key)

    expect(resA.status).toBe(429);
    expect(resB.status).toBe(200);
  });

  it('falls back to IP key when subject is anonymous', async () => {
    const handler = withRateLimit({ limit: 1, routeKey: ROUTE, store, now }, okHandler);
    const ctx = makeCtx({ kind: 'anonymous' });
    const req1 = makeReq({ 'x-forwarded-for': '1.2.3.4' });
    const req2 = makeReq({ 'x-forwarded-for': '1.2.3.4' });

    expect((await handler(req1, ctx)).status).toBe(200);
    expect((await handler(req2, ctx)).status).toBe(429);
  });

  it('treats true-anonymous (no XFF, no guest) as always allowed (local dev safeguard)', async () => {
    const handler = withRateLimit({ limit: 1, routeKey: ROUTE, store, now }, okHandler);
    const ctx = makeCtx({ kind: 'anonymous' });

    for (let i = 0; i < 5; i++) {
      const res = await handler(makeReq(), ctx);
      expect(res.status).toBe(200);
    }
  });

  it('resets when the hour bucket changes', async () => {
    let currentTime = FIXED_NOW;
    const handler = withRateLimit(
      { limit: 1, routeKey: ROUTE, store, now: () => currentTime },
      okHandler,
    );
    const ctx = makeCtx({ kind: 'guest', guestSessionId: 'g-1' });

    expect((await handler(makeReq(), ctx)).status).toBe(200);
    expect((await handler(makeReq(), ctx)).status).toBe(429);

    // next hour
    currentTime = new Date('2026-05-30T16:00:00Z');
    expect((await handler(makeReq(), ctx)).status).toBe(200);
  });
});
