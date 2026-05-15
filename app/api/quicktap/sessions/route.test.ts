import { describe, expect, it } from 'vitest';

import { POST } from './route';

import { decodeNdjsonStream } from '@/lib/agent/stream';

import type { StreamEvent } from '@/domain/schemas';

type ErrBody = { error: { code: string; message: string } };

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/quicktap/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID_BODY = {
  localeId: 'miyagi',
  ingredients: ['miyagi-seri', 'miyagi-oyster'],
  sessionId: 'sess_test_1',
};

async function collectEvents(res: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  const stream = res.body;
  if (!stream) throw new Error('expected response body');
  for await (const e of decodeNdjsonStream(stream)) events.push(e);
  return events;
}

describe('POST /api/quicktap/sessions', () => {
  it('returns 200 with NDJSON content-type and forwards sessionId in header', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    expect(res.headers.get('x-mlpr-session-id')).toBe('sess_test_1');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('streams a complete session: 1 + 21 + 1 = 23 events covering all 3 strategies', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const events = await collectEvents(res);
    expect(events.length).toBe(23);
    expect(events[0]?.type).toBe('session.start');
    expect(events[events.length - 1]?.type).toBe('session.done');

    const strategies = events.filter((e) => e.type === 'candidate.start').map((e) => e.strategy);
    expect(strategies).toEqual(['exploit', 'tune', 'explore']);
  });

  it('streams at least 9 candidate.* events (3 candidates × 3 mandatory events)', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const events = await collectEvents(res);
    const candidateEvents = events.filter((e) => e.type.startsWith('candidate.'));
    expect(candidateEvents.length).toBeGreaterThanOrEqual(9);
  });

  it('returns 400 BAD_BODY for invalid JSON', async () => {
    const res = await POST(makeRequest('{not-json'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_BODY');
  });

  it('returns 400 BAD_BODY when localeId is missing', async () => {
    const res = await POST(makeRequest({ ingredients: ['x'], sessionId: 's' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_BODY');
  });

  it('returns 400 BAD_BODY when ingredients is empty', async () => {
    const res = await POST(makeRequest({ localeId: 'miyagi', ingredients: [], sessionId: 's' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_BODY');
  });

  it('returns 400 BAD_BODY when sessionId is missing', async () => {
    const res = await POST(makeRequest({ localeId: 'miyagi', ingredients: ['miyagi-seri'] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('BAD_BODY');
  });
});
