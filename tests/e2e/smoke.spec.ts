import { expect, test } from '@playwright/test';

/**
 * Slice 1 のスモーク: /api/health が 200 / { ok: true } を返すこと。
 * 本格的な UI ジャーニーは Slice 2 以降で追加。
 */
test('GET /api/health returns 200 with { ok: true }', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { ok: boolean };
  expect(body.ok).toBe(true);
});
