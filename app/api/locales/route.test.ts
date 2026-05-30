import { describe, expect, it } from 'vitest';

import { GET } from './route';

import type { Locale } from '@/domain/locale';

type LocalesResponse = { locales: Locale[] };

describe('GET /api/locales', () => {
  it('returns 200 with locales array', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as LocalesResponse;
    expect(Array.isArray(body.locales)).toBe(true);
    expect(body.locales.length).toBeGreaterThan(0);
  });

  it('includes the original 3 curated prefectures (miyagi/nagano/kochi)', async () => {
    // 2026-05 に 47 都道府県へ拡張 (c06cae8)。初期 3 県は引き続き含まれる必要がある。
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as LocalesResponse;
    const ids = body.locales.map((l) => l.id);
    for (const required of ['miyagi', 'nagano', 'kochi']) {
      expect(ids).toContain(required);
    }
  });

  it('returns all 47 prefectures', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as LocalesResponse;
    expect(body.locales).toHaveLength(47);
  });

  it('each locale has the required Locale shape', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as LocalesResponse;
    for (const l of body.locales) {
      expect(typeof l.id).toBe('string');
      expect(typeof l.prefecture).toBe('string');
      expect(l.prefectureCode).toMatch(/^JP-\d{2}$/);
      expect(typeof l.region).toBe('string');
    }
  });

  it('omits ingredients from the response (payload optimization)', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as { locales: Array<Record<string, unknown>> };
    for (const l of body.locales) {
      expect(l.ingredients).toBeUndefined();
    }
  });

  it('preserves cities when present', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as LocalesResponse;
    const miyagi = body.locales.find((l) => l.id === 'miyagi');
    expect(miyagi?.cities).toBeDefined();
    expect(miyagi?.cities?.length).toBeGreaterThan(0);
  });
});
