import { describe, expect, it } from 'vitest';

import { decodeNdjsonStream } from '@/lib/agent/stream';

import { POST } from './route';

import type { StreamEvent } from '@/domain/schemas';

type ErrBody = { error: { code: string; message: string } };

function makeRequest(candidateId: string, body: unknown): Request {
  return new Request(`http://localhost/api/recipes/${candidateId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID_BODY = {
  localeId: 'miyagi',
  ingredients: ['miyagi-seri', 'miyagi-oyster'],
  candidate: {
    candidateId: 'c_1_abcxyz',
    strategy: 'exploit',
    title: '松島の牡蠣ピザ',
    concept: '海の旨味を素直に',
    keyIngredients: ['牡蠣', 'モッツァレラ'],
    sceneTags: ['週末家族'],
    why: '王道の組合せ',
  },
};

async function collectEvents(res: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  const stream = res.body;
  if (!stream) throw new Error('expected response body');
  for await (const e of decodeNdjsonStream(stream)) events.push(e);
  return events;
}

describe('POST /api/recipes/[candidateId]', () => {
  it('returns 200 with NDJSON content-type and recipe id header', async () => {
    const res = await POST(makeRequest('c_1_abcxyz', VALID_BODY));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    expect(res.headers.get('x-mlpr-recipe-id')).toBe('c_1_abcxyz');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('streams 9 recipe.* + image.* events ending with recipe.done + image.ready', async () => {
    const res = await POST(makeRequest('c_test', VALID_BODY));
    const events = await collectEvents(res);
    expect(events.length).toBe(9);
    const types = new Set<string>(events.map((e) => e.type));
    for (const t of [
      'recipe.start',
      'image.start',
      'recipe.title',
      'recipe.meta',
      'recipe.materials',
      'recipe.steps',
      'recipe.story',
      'recipe.done',
      'image.ready',
    ]) {
      expect(types.has(t)).toBe(true);
    }
  });

  it('returns 400 BAD_BODY for invalid JSON', async () => {
    const res = await POST(makeRequest('c_x', '{not-json'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_BODY');
  });

  it('returns 400 BAD_BODY when candidate is missing', async () => {
    const body = { localeId: 'miyagi', ingredients: ['miyagi-seri'] };
    const res = await POST(makeRequest('c_x', body));
    expect(res.status).toBe(400);
    const err = (await res.json()) as ErrBody;
    expect(err.error.code).toBe('BAD_BODY');
  });

  it('returns 400 BAD_BODY when ingredients is empty', async () => {
    const body = { ...VALID_BODY, ingredients: [] };
    const res = await POST(makeRequest('c_x', body));
    expect(res.status).toBe(400);
  });
});
