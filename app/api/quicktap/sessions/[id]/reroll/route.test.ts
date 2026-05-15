import { describe, expect, it } from 'vitest';

import { decodeNdjsonStream } from '@/lib/agent/stream';

import { POST } from './route';

import type { StreamEvent } from '@/domain/schemas';

function makeRequest(sessionId: string): Request {
  return new Request(`http://localhost/api/quicktap/sessions/${sessionId}/reroll`, {
    method: 'POST',
  });
}

async function collectEvents(res: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  const stream = res.body;
  if (!stream) throw new Error('expected response body');
  for await (const e of decodeNdjsonStream(stream)) events.push(e);
  return events;
}

describe('POST /api/quicktap/sessions/[id]/reroll', () => {
  it('returns 200 with NDJSON content-type and source session header', async () => {
    const res = await POST(makeRequest('sess_orig_1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    expect(res.headers.get('x-mlpr-source-session-id')).toBe('sess_orig_1');
  });

  it('streams a complete 23-event session with all 3 strategies', async () => {
    const res = await POST(makeRequest('sess_orig_1'));
    const events = await collectEvents(res);
    expect(events.length).toBe(23);
    expect(events[0]?.type).toBe('session.start');
    expect(events[events.length - 1]?.type).toBe('session.done');

    const strategies = events.filter((e) => e.type === 'candidate.start').map((e) => e.strategy);
    expect(strategies).toEqual(['exploit', 'tune', 'explore']);
  });

  it('emits a new sessionId different from the source', async () => {
    const res = await POST(makeRequest('sess_orig_2'));
    const events = await collectEvents(res);
    const start = events[0];
    if (start?.type !== 'session.start') throw new Error('expected session.start');
    expect(start.sessionId).not.toBe('sess_orig_2');
  });

  it('successive rerolls of the same source produce distinct new sessionIds', async () => {
    // 2 つの reroll は同一プロセス内 (singleton agent) で連続呼び出し → カウンタが進む
    const e1 = await collectEvents(await POST(makeRequest('sess_for_reroll')));
    const e2 = await collectEvents(await POST(makeRequest('sess_for_reroll')));
    const s1 = e1[0]?.type === 'session.start' ? e1[0].sessionId : '';
    const s2 = e2[0]?.type === 'session.start' ? e2[0].sessionId : '';
    expect(s1).not.toBe(s2);
  });
});
