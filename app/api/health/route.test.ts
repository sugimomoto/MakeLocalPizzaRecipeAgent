import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await GET(new Request('http://localhost/api/health'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { ok: boolean };
    expect(body).toEqual({ ok: true });
  });

  it('passes through anonymous requests (no auth required)', async () => {
    const res = await GET(new Request('http://localhost/api/health'));
    expect(res.status).toBe(200);
  });
});
