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

  it('returns the 3 curated prefectures (miyagi/nagano/kochi)', async () => {
    const res = await GET(new Request('http://localhost/api/locales'));
    const body = (await res.json()) as LocalesResponse;
    expect(body.locales.map((l) => l.id)).toEqual(['miyagi', 'nagano', 'kochi']);
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
