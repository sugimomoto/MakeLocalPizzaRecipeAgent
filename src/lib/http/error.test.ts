import { describe, expect, it } from 'vitest';

import { ApiError, apiError, isApiError, toErrorResponse, withErrorHandler } from './error';

describe('ApiError', () => {
  it('preserves status, code, and message and is a real Error', () => {
    const e = new ApiError(400, 'INVALID_LOCALE', 'localeId not allowed');
    expect(e.status).toBe(400);
    expect(e.code).toBe('INVALID_LOCALE');
    expect(e.message).toBe('localeId not allowed');
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe('ApiError');
  });

  it('toBody() yields the canonical {error:{code,message}} shape', () => {
    const e = new ApiError(404, 'NOT_FOUND', 'session missing');
    expect(e.toBody()).toEqual({ error: { code: 'NOT_FOUND', message: 'session missing' } });
  });
});

describe('apiError factories', () => {
  it.each([
    ['badRequest', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['notFound', 404],
    ['conflict', 409],
    ['unprocessable', 422],
    ['internal', 500],
  ] as const)('apiError.%s returns status %i', (factory, status) => {
    const e = apiError[factory]('CODE', 'msg');
    expect(e.status).toBe(status);
    expect(e.code).toBe('CODE');
  });
});

describe('toErrorResponse', () => {
  it('produces a Response with status, JSON content-type, and canonical body for an ApiError', async () => {
    const res = toErrorResponse(apiError.badRequest('INVALID_LOCALE', 'oops'));
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body).toEqual({ error: { code: 'INVALID_LOCALE', message: 'oops' } });
  });

  it('falls back to 500 INTERNAL_ERROR for unknown thrown values', async () => {
    const res = toErrorResponse(new Error('plain'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('also handles non-Error throws (string / number / undefined)', async () => {
    for (const thrown of ['boom', 42, undefined, null]) {
      const res = toErrorResponse(thrown);
      expect(res.status).toBe(500);
    }
  });
});

describe('isApiError', () => {
  it('discriminates ApiError from plain Error', () => {
    expect(isApiError(apiError.notFound('X', 'y'))).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe('withErrorHandler', () => {
  it('passes through the handler response on success', async () => {
    const wrapped = withErrorHandler(async () => new Response('ok', { status: 200 }));
    const res = await wrapped();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('catches ApiError and converts to canonical Response', async () => {
    const wrapped = withErrorHandler(async () => {
      throw apiError.unauthorized('UNAUTH', 'login required');
    });
    const res = await wrapped();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTH');
  });

  it('catches unknown errors and returns 500', async () => {
    const wrapped = withErrorHandler(async () => {
      throw new Error('boom');
    });
    const res = await wrapped();
    expect(res.status).toBe(500);
  });

  it('forwards arbitrary handler arguments', async () => {
    const wrapped = withErrorHandler(async (n: number, s: string) => {
      return Response.json({ n, s });
    });
    const res = await wrapped(7, 'hi');
    expect(await res.json()).toEqual({ n: 7, s: 'hi' });
  });
});
