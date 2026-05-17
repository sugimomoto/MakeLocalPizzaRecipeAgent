import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpAgentClient } from './http-client';
import { decodeNdjsonStream } from './stream';

import type { Candidate } from '@/domain/candidate';
import type { StreamEvent } from '@/domain/schemas';

function ndjsonBody(events: StreamEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      }
      controller.close();
    },
  });
}

const SAMPLE: StreamEvent[] = [
  { type: 'session.start', sessionId: 'sess_x', strategies: ['exploit', 'tune', 'explore'] },
  { type: 'session.done', sessionId: 'sess_x' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HttpAgentClient.generateCandidates', () => {
  it('POSTs to /agent/generate-candidates with correct body shape', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(ndjsonBody(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    const stream = await client.generateCandidates({
      localeId: 'miyagi',
      ingredients: ['miyagi-seri'],
      guestSessionId: 'guest_abc',
    });
    expect(stream).toBeInstanceOf(ReadableStream);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    const url = call[0];
    const init = call[1]!;
    expect(url).toBe('http://localhost:8080/agent/generate-candidates');
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients).toEqual(['miyagi-seri']);
    expect(body.guestSessionId).toBe('guest_abc');
    expect(body.sessionId).toMatch(/^sess_/);
  });

  it('throws when fetch returns non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    await expect(
      client.generateCandidates({ localeId: 'miyagi', ingredients: ['x'] }),
    ).rejects.toThrow(/Agent HTTP 500/);
  });

  it('throws when response body is null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    await expect(
      client.generateCandidates({ localeId: 'miyagi', ingredients: ['x'] }),
    ).rejects.toThrow();
  });

  it('the returned stream parses back to original events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(ndjsonBody(SAMPLE), { status: 200 })),
    );
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    const stream = await client.generateCandidates({
      localeId: 'miyagi',
      ingredients: ['miyagi-seri'],
    });
    const events: StreamEvent[] = [];
    for await (const e of decodeNdjsonStream(stream)) events.push(e);
    expect(events).toEqual(SAMPLE);
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(ndjsonBody(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080/' });
    await client.generateCandidates({ localeId: 'miyagi', ingredients: ['x'] });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:8080/agent/generate-candidates');
  });
});

describe('HttpAgentClient.generateRecipeDetail', () => {
  const candidate: Candidate = {
    candidateId: 'c_1_abcxyz',
    strategy: 'exploit',
    title: '松島の牡蠣ピザ',
    concept: '海の旨味を素直に',
    keyIngredients: ['牡蠣', 'モッツァレラ'],
    sceneTags: ['週末家族'],
    why: '王道',
  };

  it('POSTs to /agent/recipes/{candidateId} with full body and percent-encodes path', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          ndjsonBody([
            { type: 'recipe.start', recipeId: 'c id with space' },
            { type: 'recipe.done', recipeId: 'c id with space' },
          ]),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    await client.generateRecipeDetail({
      candidateId: 'c id with space',
      localeId: 'miyagi',
      ingredients: ['miyagi-seri'],
      candidate,
      guestSessionId: 'guest_x',
    });
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('http://localhost:8080/agent/recipes/c%20id%20with%20space');
    const body = JSON.parse(String(call[1]!.body));
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients).toEqual(['miyagi-seri']);
    expect(body.candidate).toEqual(candidate);
    expect(body.guestSessionId).toBe('guest_x');
  });

  it('throws when fetch returns non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 502 })),
    );
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    await expect(
      client.generateRecipeDetail({
        candidateId: 'c_1',
        localeId: 'miyagi',
        ingredients: ['x'],
        candidate,
      }),
    ).rejects.toThrow(/Agent HTTP 502/);
  });
});

describe('HttpAgentClient.reroll', () => {
  it('throws if no context was cached', async () => {
    const client = new HttpAgentClient({ baseUrl: 'http://localhost:8080' });
    await expect(client.reroll('unknown')).rejects.toThrow(/no context cached/);
  });

  it('POSTs to /agent/reroll with sourceSessionId + new sessionId + cached localeId/ingredients', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(ndjsonBody(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const cache = new Map<string, { localeId: string; ingredients: string[] }>();
    cache.set('sess_orig', { localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    const client = new HttpAgentClient({
      baseUrl: 'http://localhost:8080',
      rerollContextCache: cache,
    });

    await client.reroll('sess_orig');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    const url = call[0];
    const init = call[1]!;
    expect(url).toBe('http://localhost:8080/agent/reroll');
    const body = JSON.parse(String(init.body));
    expect(body.sourceSessionId).toBe('sess_orig');
    expect(body.sessionId).toMatch(/^sess_/);
    expect(body.sessionId).not.toBe('sess_orig');
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients).toEqual(['miyagi-seri']);
  });
});
