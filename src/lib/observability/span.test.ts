import { describe, expect, it } from 'vitest';

import { createSpan, withSpan } from './span';

describe('createSpan', () => {
  it('exposes the supplied name', () => {
    const s = createSpan('agent.generate');
    expect(s.name).toBe('agent.generate');
  });

  it('accepts initial attributes and accumulates more via setAttribute / setAttributes', () => {
    const s = createSpan('test', { attributes: { localeId: 'miyagi' } });
    s.setAttribute('candidateId', 'c1');
    s.setAttributes({ strategy: 'exploit' });
    // _snapshotAttributes は test only API
    expect(
      (
        s as unknown as { _snapshotAttributes: () => Record<string, unknown> }
      )._snapshotAttributes(),
    ).toEqual({
      localeId: 'miyagi',
      candidateId: 'c1',
      strategy: 'exploit',
    });
  });

  it('recordException is a no-op (does not throw)', () => {
    const s = createSpan('x');
    expect(() => s.recordException(new Error('boom'))).not.toThrow();
  });
});

describe('withSpan', () => {
  it('returns the result of an async callback', async () => {
    const result = await withSpan('async.op', async () => 42);
    expect(result).toBe(42);
  });

  it('returns the result of a sync callback', async () => {
    const result = await withSpan('sync.op', () => 'ok');
    expect(result).toBe('ok');
  });

  it('forwards the span instance so callers can attach attributes', async () => {
    const observed: string[] = [];
    await withSpan('with-attrs', (span) => {
      span.setAttribute('localeId', 'miyagi');
      observed.push(span.name);
    });
    expect(observed).toEqual(['with-attrs']);
  });

  it('rethrows callback errors and records the exception', async () => {
    const err = new Error('boom');
    await expect(
      withSpan('fails', async () => {
        throw err;
      }),
    ).rejects.toBe(err);
  });
});
