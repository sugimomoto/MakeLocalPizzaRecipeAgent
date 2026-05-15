import { describe, expect, it } from 'vitest';

import { GET } from './route';

import type { Ingredient } from '@/domain/ingredient';

type Body = { localeId: string; ingredients: Ingredient[] };
type ErrBody = { error: { code: string; message: string } };

function url(id: string, search = ''): string {
  return `http://localhost/api/locales/${id}/ingredients${search}`;
}

describe('GET /api/locales/[id]/ingredients', () => {
  it('returns 200 with all 10 ingredients for miyagi', async () => {
    const res = await GET(new Request(url('miyagi')));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients.length).toBe(10);
    for (const i of body.ingredients) {
      expect(i.localeId).toBe('miyagi');
    }
  });

  it('filters by season', async () => {
    const res = await GET(new Request(url('miyagi', '?season=winter')));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.ingredients.length).toBeGreaterThan(0);
    for (const i of body.ingredients) {
      expect(i.seasons.includes('winter') || i.seasons.includes('all-year')).toBe(true);
    }
  });

  it('filters by category', async () => {
    const res = await GET(new Request(url('miyagi', '?category=seafood')));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    for (const i of body.ingredients) {
      expect(i.category).toBe('seafood');
    }
  });

  it('combines season + category filters', async () => {
    const res = await GET(new Request(url('miyagi', '?season=winter&category=seafood')));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    for (const i of body.ingredients) {
      expect(i.category).toBe('seafood');
      expect(i.seasons.includes('winter') || i.seasons.includes('all-year')).toBe(true);
    }
  });

  it('returns 404 LOCALE_NOT_FOUND for unknown locale id', async () => {
    const res = await GET(new Request(url('atlantis')));
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('LOCALE_NOT_FOUND');
  });

  it('returns 400 BAD_QUERY for invalid season', async () => {
    const res = await GET(new Request(url('miyagi', '?season=rainy')));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_QUERY');
  });

  it('returns 400 BAD_QUERY for invalid category', async () => {
    const res = await GET(new Request(url('miyagi', '?category=spice')));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_QUERY');
  });

  it('all-year ingredients pass any season filter', async () => {
    // 仙台牛 (all-year) は ?season=spring でも返るはず
    const res = await GET(new Request(url('miyagi', '?season=spring')));
    const body = (await res.json()) as Body;
    const ids = body.ingredients.map((i) => i.id);
    expect(ids).toContain('miyagi-sendai-beef');
  });
});
