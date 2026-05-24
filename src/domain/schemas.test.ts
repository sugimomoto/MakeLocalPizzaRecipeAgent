import { describe, expect, it } from 'vitest';

import { StreamEventSchema } from './schemas';

import type { StreamEvent } from './schemas';

describe('StreamEventSchema (positive cases)', () => {
  it('parses session.start with full strategies', () => {
    const e: StreamEvent = {
      type: 'session.start',
      sessionId: 'sess_xxx',
      strategies: ['exploit', 'tune', 'explore'],
    };
    expect(StreamEventSchema.parse(e)).toEqual(e);
  });

  it('parses each candidate.* event', () => {
    const events: StreamEvent[] = [
      { type: 'candidate.start', strategy: 'tune', candidateId: 'c_2' },
      { type: 'candidate.title', candidateId: 'c_2', title: '春のせり白ピザ' },
      { type: 'candidate.concept', candidateId: 'c_2', concept: 'ほろ苦さを朝食に' },
      { type: 'candidate.ingredients', candidateId: 'c_2', ingredients: ['せり', 'モッツァ'] },
      { type: 'candidate.sceneTags', candidateId: 'c_2', sceneTags: ['朝食'] },
      { type: 'candidate.why', candidateId: 'c_2', why: '一手だけ外した提案' },
      { type: 'candidate.done', candidateId: 'c_2' },
    ];
    for (const e of events) {
      expect(StreamEventSchema.safeParse(e).success).toBe(true);
    }
  });

  it('parses session.done and error', () => {
    expect(StreamEventSchema.parse({ type: 'session.done', sessionId: 'sess_xxx' })).toMatchObject({
      type: 'session.done',
    });
    expect(
      StreamEventSchema.parse({ type: 'error', code: 'AGENT_TIMEOUT', message: 'timed out' }),
    ).toMatchObject({ type: 'error' });
  });

  it('strips unknown extra fields by default (Zod object behavior)', () => {
    const input: unknown = {
      type: 'candidate.done',
      candidateId: 'c_1',
      foo: 'bar',
    };
    const result = StreamEventSchema.parse(input);
    expect(result).toEqual({ type: 'candidate.done', candidateId: 'c_1' });
  });
});

describe('StreamEventSchema (boundary / negative cases)', () => {
  it('rejects an unknown type discriminator', () => {
    const r = StreamEventSchema.safeParse({ type: 'session.boom', sessionId: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects session.start with empty sessionId', () => {
    const r = StreamEventSchema.safeParse({
      type: 'session.start',
      sessionId: '',
      strategies: ['exploit'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects session.start with empty strategies array', () => {
    const r = StreamEventSchema.safeParse({
      type: 'session.start',
      sessionId: 'x',
      strategies: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects candidate.start with an invalid strategy enum', () => {
    const r = StreamEventSchema.safeParse({
      type: 'candidate.start',
      strategy: 'random',
      candidateId: 'c_1',
    });
    expect(r.success).toBe(false);
  });

  it('rejects candidate.title missing the title field', () => {
    const r = StreamEventSchema.safeParse({
      type: 'candidate.title',
      candidateId: 'c_1',
    });
    expect(r.success).toBe(false);
  });

  it('rejects candidate.ingredients with a non-string element', () => {
    const r = StreamEventSchema.safeParse({
      type: 'candidate.ingredients',
      candidateId: 'c_1',
      ingredients: ['cheese', 42],
    });
    expect(r.success).toBe(false);
  });

  it('rejects error event with missing code', () => {
    const r = StreamEventSchema.safeParse({ type: 'error', message: 'oops' });
    expect(r.success).toBe(false);
  });

  it('rejects entirely non-object input', () => {
    expect(StreamEventSchema.safeParse(null).success).toBe(false);
    expect(StreamEventSchema.safeParse('session.start').success).toBe(false);
    expect(StreamEventSchema.safeParse([]).success).toBe(false);
  });
});

describe('StreamEvent type narrowing', () => {
  it('discriminated union narrows by type', () => {
    const raw = JSON.parse('{"type":"candidate.title","candidateId":"c_1","title":"X"}');
    const parsed = StreamEventSchema.parse(raw);
    if (parsed.type === 'candidate.title') {
      // TypeScript narrows: parsed.title is string
      expect(parsed.title.length).toBeGreaterThan(0);
    } else {
      throw new Error('discriminator should narrow to candidate.title');
    }
  });
});

describe('StreamEventSchema (Slice 3 recipe.* events)', () => {
  it('parses recipe.start and recipe.done', () => {
    expect(StreamEventSchema.parse({ type: 'recipe.start', recipeId: 'r_1' })).toMatchObject({
      type: 'recipe.start',
    });
    expect(StreamEventSchema.parse({ type: 'recipe.done', recipeId: 'r_1' })).toMatchObject({
      type: 'recipe.done',
    });
  });

  it('parses recipe.title', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.title',
      recipeId: 'r_1',
      title: '松島の牡蠣と、名取のせり。',
    });
    expect(r.success).toBe(true);
  });

  it('parses recipe.meta with all 4 axes', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.meta',
      recipeId: 'r_1',
      meta: { servings: 'ピザ 1 枚分', duration: '45m', bakingTemp: '270°C', difficulty: '★★☆' },
    });
    expect(r.success).toBe(true);
  });

  it('parses recipe.materials with at least one entry', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.materials',
      recipeId: 'r_1',
      materials: [{ name: '強力粉', quantity: '300g' }],
    });
    expect(r.success).toBe(true);
  });

  it('parses recipe.steps', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.steps',
      recipeId: 'r_1',
      steps: ['伸ばす', '乗せる', '焼く'],
    });
    expect(r.success).toBe(true);
  });

  it('parses recipe.story', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.story',
      recipeId: 'r_1',
      eyebrow: 'ゲストに語る',
      headline: '海と田畑。',
      body: '宮城の夜。',
    });
    expect(r.success).toBe(true);
  });

  it('rejects recipe.materials with empty array', () => {
    const r = StreamEventSchema.safeParse({
      type: 'recipe.materials',
      recipeId: 'r_1',
      materials: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects recipe.steps with empty array', () => {
    const r = StreamEventSchema.safeParse({ type: 'recipe.steps', recipeId: 'r_1', steps: [] });
    expect(r.success).toBe(false);
  });

  it('rejects recipe.* with empty recipeId', () => {
    const r = StreamEventSchema.safeParse({ type: 'recipe.start', recipeId: '' });
    expect(r.success).toBe(false);
  });
});

describe('StreamEventSchema (Slice 3 image.* events)', () => {
  it('parses image.start', () => {
    const r = StreamEventSchema.safeParse({ type: 'image.start', recipeId: 'r_1' });
    expect(r.success).toBe(true);
  });

  it('parses image.ready with URL', () => {
    const r = StreamEventSchema.safeParse({
      type: 'image.ready',
      recipeId: 'r_1',
      url: 'https://storage.googleapis.com/mlpr-local.appspot.com/recipes/r_1.png',
    });
    expect(r.success).toBe(true);
  });

  it('parses image.error', () => {
    const r = StreamEventSchema.safeParse({
      type: 'image.error',
      recipeId: 'r_1',
      code: 'IMAGEN_FAIL',
      message: 'quota exceeded',
    });
    expect(r.success).toBe(true);
  });

  it('rejects image.ready with empty url', () => {
    const r = StreamEventSchema.safeParse({
      type: 'image.ready',
      recipeId: 'r_1',
      url: '',
    });
    expect(r.success).toBe(false);
  });

  it('rejects old image.ready shape with dataUri (Slice 4 で破壊変更)', () => {
    const r = StreamEventSchema.safeParse({
      type: 'image.ready',
      recipeId: 'r_1',
      dataUri: 'data:image/png;base64,iVBORw0KGgo=',
    });
    expect(r.success).toBe(false);
  });
});
