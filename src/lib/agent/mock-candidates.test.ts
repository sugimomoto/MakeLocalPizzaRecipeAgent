import { describe, expect, it } from 'vitest';

import { MockAgentClient } from './mock-candidates';
import { decodeNdjsonStream } from './stream';

import type { GenerateCandidatesInput, GenerateRecipeDetailInput } from './client';
import type { Candidate } from '@/domain/candidate';
import type { StreamEvent } from '@/domain/schemas';

const FAST = { min: 0, max: 0 } as const;

const SAMPLE_INPUT: GenerateCandidatesInput = {
  localeId: 'miyagi',
  ingredients: ['miyagi-seri', 'miyagi-oyster'],
};

async function collect(stream: ReadableStream<Uint8Array>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of decodeNdjsonStream(stream)) out.push(e);
  return out;
}

describe('MockAgentClient.generateCandidates', () => {
  it('emits a complete session: 1 session.start + 3 candidates × 7 events + 1 session.done', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateCandidates(SAMPLE_INPUT));
    // 1 + (7 * 3) + 1 = 23
    expect(events.length).toBe(23);
    expect(events[0]?.type).toBe('session.start');
    expect(events[events.length - 1]?.type).toBe('session.done');
  });

  it('produces all 3 strategies in canonical order (exploit, tune, explore)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateCandidates(SAMPLE_INPUT));
    const strategies = events.filter((e) => e.type === 'candidate.start').map((e) => e.strategy);
    expect(strategies).toEqual(['exploit', 'tune', 'explore']);
  });

  it('every event passes Zod validation (covered by decodeNdjsonStream throwing on failure)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateCandidates(SAMPLE_INPUT));
    // collect が throw しなければスキーマ違反は無し
    expect(events.length).toBeGreaterThan(0);
  });

  it('candidate.title uses the strategy-specific template', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateCandidates(SAMPLE_INPUT));

    const titleByStrategy = new Map<string, string>();
    let currentStrategy: string | null = null;
    for (const e of events) {
      if (e.type === 'candidate.start') currentStrategy = e.strategy;
      if (e.type === 'candidate.title' && currentStrategy)
        titleByStrategy.set(currentStrategy, e.title);
    }
    // exploit: 「白ピザ」、tune: 「柑橘」、explore: 「チョコレート」を含む
    expect(titleByStrategy.get('exploit')).toMatch(/白ピザ/);
    expect(titleByStrategy.get('tune')).toMatch(/柑橘/);
    expect(titleByStrategy.get('explore')).toMatch(/チョコレート/);
  });

  it('is deterministic: same input → same event sequence', async () => {
    const c1 = new MockAgentClient({ delayRange: FAST });
    const c2 = new MockAgentClient({ delayRange: FAST });
    const a = await collect(await c1.generateCandidates(SAMPLE_INPUT));
    const b = await collect(await c2.generateCandidates(SAMPLE_INPUT));
    expect(a).toEqual(b);
  });

  it('different localeId / ingredients yield different sessionId', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const a = await collect(await client.generateCandidates(SAMPLE_INPUT));
    const b = await collect(
      await client.generateCandidates({ localeId: 'kochi', ingredients: ['kochi-yuzu'] }),
    );
    const sa = a[0]?.type === 'session.start' ? a[0].sessionId : null;
    const sb = b[0]?.type === 'session.start' ? b[0].sessionId : null;
    expect(sa).toBeTruthy();
    expect(sb).toBeTruthy();
    expect(sa).not.toBe(sb);
  });

  it('ingredient order does not affect sessionId (sorted internally)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const a = await collect(
      await client.generateCandidates({
        localeId: 'miyagi',
        ingredients: ['miyagi-seri', 'miyagi-oyster'],
      }),
    );
    const b = await collect(
      await client.generateCandidates({
        localeId: 'miyagi',
        ingredients: ['miyagi-oyster', 'miyagi-seri'],
      }),
    );
    const sa = a[0]?.type === 'session.start' ? a[0].sessionId : null;
    const sb = b[0]?.type === 'session.start' ? b[0].sessionId : null;
    expect(sa).toBe(sb);
  });
});

describe('MockAgentClient.reroll', () => {
  // Slice 7: reroll は context (localeId / ingredients) を必須化
  const CTX_ABC = {
    sourceSessionId: 'sess_abc',
    localeId: 'miyagi',
    ingredients: ['miyagi-seri'],
  };
  const CTX_XYZ = {
    sourceSessionId: 'sess_xyz',
    localeId: 'miyagi',
    ingredients: ['miyagi-seri'],
  };

  it('returns a different sessionId than the input sessionId', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.reroll(CTX_ABC));
    const first = events[0];
    if (first?.type !== 'session.start') throw new Error('expected session.start first');
    expect(first.sessionId).not.toBe('sess_abc');
  });

  it('successive rerolls of the same sessionId yield distinct sessionIds', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const a = await collect(await client.reroll(CTX_XYZ));
    const b = await collect(await client.reroll(CTX_XYZ));
    const sa = a[0]?.type === 'session.start' ? a[0].sessionId : '';
    const sb = b[0]?.type === 'session.start' ? b[0].sessionId : '';
    expect(sa).not.toBe(sb);
  });
});

describe('MockAgentClient.generateRecipeDetail', () => {
  const candidate: Candidate = {
    candidateId: 'c_1_abcxyz',
    strategy: 'exploit',
    title: '松島の牡蠣ピザ',
    concept: '海の旨味を素直に',
    keyIngredients: ['牡蠣', 'モッツァレラ'],
    sceneTags: ['週末家族'],
    why: '王道の組合せ',
  };

  const input: GenerateRecipeDetailInput = {
    candidateId: 'c_1_abcxyz',
    localeId: 'miyagi',
    ingredients: ['miyagi-seri'],
    candidate,
  };

  it('emits the full recipe.* + image.* sequence (9 events)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateRecipeDetail(input));
    // 2 (start pair) + 6 (recipe text) + 1 (image.ready) = 9
    expect(events.length).toBe(9);
    const types = events.map((e) => e.type);
    expect(types).toContain('recipe.start');
    expect(types).toContain('image.start');
    expect(types).toContain('recipe.title');
    expect(types).toContain('recipe.meta');
    expect(types).toContain('recipe.materials');
    expect(types).toContain('recipe.steps');
    expect(types).toContain('recipe.story');
    expect(types).toContain('recipe.done');
    expect(types).toContain('image.ready');
  });

  it('first two events are recipe.start and image.start (any order)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateRecipeDetail(input));
    const firstTwo = new Set([events[0]?.type, events[1]?.type]);
    expect(firstTwo).toEqual(new Set(['recipe.start', 'image.start']));
  });

  it('image.ready carries an image URL', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateRecipeDetail(input));
    const ready = events.find((e) => e.type === 'image.ready');
    if (ready?.type !== 'image.ready') throw new Error('expected image.ready');
    // Slice 4 で dataUri → url に変更。data URI も valid な URL なので Mock では再利用。
    expect(ready.url).toBeTruthy();
  });

  it('recipe.title reflects the input candidate', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const events = await collect(await client.generateRecipeDetail(input));
    const title = events.find((e) => e.type === 'recipe.title');
    if (title?.type !== 'recipe.title') throw new Error('expected recipe.title');
    expect(title.title).toBe('松島の牡蠣ピザ');
  });
});

describe('delayRange', () => {
  it('respects max=0 by emitting immediately (test path)', async () => {
    const client = new MockAgentClient({ delayRange: FAST });
    const t0 = Date.now();
    await collect(await client.generateCandidates(SAMPLE_INPUT));
    const elapsed = Date.now() - t0;
    // 23 events × ~delay = ~0ms in fast mode (allow generous slack for jsdom)
    expect(elapsed).toBeLessThan(500);
  });
});
