import { describe, expect, it } from 'vitest';

import { apiError } from './error';
import { GUEST_SESSION_HEADER, resolveAuthSubject, withAuthOptional } from './with-auth';

describe('resolveAuthSubject', () => {
  it('returns guest subject when the guest session header is present', () => {
    const req = new Request('http://x', {
      headers: { [GUEST_SESSION_HEADER]: 'guest_abc' },
    });
    const s = resolveAuthSubject(req);
    expect(s).toEqual({ kind: 'guest', guestSessionId: 'guest_abc' });
  });

  it('trims whitespace around the header value', () => {
    const req = new Request('http://x', {
      headers: { [GUEST_SESSION_HEADER]: '   guest_xyz   ' },
    });
    expect(resolveAuthSubject(req)).toEqual({ kind: 'guest', guestSessionId: 'guest_xyz' });
  });

  it('returns anonymous when the header is absent', () => {
    const req = new Request('http://x');
    expect(resolveAuthSubject(req)).toEqual({ kind: 'anonymous' });
  });

  it('returns anonymous when the header is whitespace-only', () => {
    const req = new Request('http://x', {
      headers: { [GUEST_SESSION_HEADER]: '   ' },
    });
    expect(resolveAuthSubject(req)).toEqual({ kind: 'anonymous' });
  });
});

describe('withAuthOptional', () => {
  it('always passes through (Slice 1: never rejects) and forwards subject', async () => {
    const wrapped = withAuthOptional(async (_req, ctx) => {
      return Response.json({ subject: ctx.subject });
    });
    const guestRes = await wrapped(
      new Request('http://x', { headers: { [GUEST_SESSION_HEADER]: 'guest_g' } }),
    );
    expect(guestRes.status).toBe(200);
    expect(await guestRes.json()).toEqual({
      subject: { kind: 'guest', guestSessionId: 'guest_g' },
    });

    const anonRes = await wrapped(new Request('http://x'));
    expect(await anonRes.json()).toEqual({ subject: { kind: 'anonymous' } });
  });

  it('integrates with withErrorHandler: thrown ApiError becomes a canonical error response', async () => {
    const wrapped = withAuthOptional(async () => {
      throw apiError.forbidden('FORBIDDEN', 'no go');
    });
    const res = await wrapped(new Request('http://x'));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('integrates with withErrorHandler: thrown unknown error becomes 500', async () => {
    const wrapped = withAuthOptional(async () => {
      throw new Error('boom');
    });
    const res = await wrapped(new Request('http://x'));
    expect(res.status).toBe(500);
  });
});
