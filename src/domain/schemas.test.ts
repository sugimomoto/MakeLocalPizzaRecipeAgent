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
