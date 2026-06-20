import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeNdjsonStream } from '@/lib/agent/stream';
import { withToastProvider as wrapperOption } from '@/test-utils/wrappers';

import { useQuickTapStream } from './use-quicktap-stream';

import type { StreamEvent } from '@/domain/schemas';

const SAMPLE_EVENTS: StreamEvent[] = [
  { type: 'session.start', sessionId: 'sess_x', strategies: ['exploit', 'tune', 'explore'] },
  { type: 'candidate.start', strategy: 'exploit', candidateId: 'c1' },
  { type: 'candidate.title', candidateId: 'c1', title: '王道ピザ' },
  { type: 'candidate.concept', candidateId: 'c1', concept: '王道のコンセプト' },
  { type: 'candidate.ingredients', candidateId: 'c1', ingredients: ['牡蠣', 'せり'] },
  { type: 'candidate.sceneTags', candidateId: 'c1', sceneTags: ['ワイン'] },
  { type: 'candidate.why', candidateId: 'c1', why: 'なぜこの提案か' },
  { type: 'candidate.done', candidateId: 'c1' },
  { type: 'candidate.start', strategy: 'tune', candidateId: 'c2' },
  { type: 'candidate.done', candidateId: 'c2' },
  { type: 'candidate.start', strategy: 'explore', candidateId: 'c3' },
  { type: 'candidate.done', candidateId: 'c3' },
  { type: 'session.done', sessionId: 'sess_x' },
];

function streamFromEvents(events: StreamEvent[]): ReadableStream<Uint8Array> {
  async function* gen(): AsyncGenerator<StreamEvent> {
    for (const e of events) yield e;
  }
  return encodeNdjsonStream(gen());
}

function makeFetchMock(
  fn: (url: string, init?: RequestInit) => Promise<Response>,
): ReturnType<typeof vi.fn> {
  return vi.fn(fn);
}

describe('useQuickTapStream', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle state with empty candidates', () => {
    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);
    expect(result.current.state).toBe('idle');
    expect(result.current.candidates).toEqual([]);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('start() transitions through streaming → done with all 3 candidates filled', async () => {
    const fetchMock = makeFetchMock(
      async () =>
        new Response(streamFromEvents(SAMPLE_EVENTS), {
          status: 200,
          headers: { 'content-type': 'application/x-ndjson' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });

    await waitFor(() => expect(result.current.state).toBe('done'));
    expect(result.current.candidates).toHaveLength(3);
    expect(result.current.candidates.map((c) => c.strategy)).toEqual([
      'exploit',
      'tune',
      'explore',
    ]);
    expect(result.current.candidates.every((c) => c.isDone)).toBe(true);
    expect(result.current.sessionId).toBe('sess_x');
  });

  it('fills c1 fields incrementally per event', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(async () => new Response(streamFromEvents(SAMPLE_EVENTS), { status: 200 })),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });

    const c1 = result.current.candidates.find((c) => c.candidateId === 'c1');
    expect(c1).toBeDefined();
    expect(c1?.title).toBe('王道ピザ');
    expect(c1?.concept).toBe('王道のコンセプト');
    expect(c1?.keyIngredients).toEqual(['牡蠣', 'せり']);
    expect(c1?.sceneTags).toEqual(['ワイン']);
    expect(c1?.why).toBe('なぜこの提案か');
    expect(c1?.isDone).toBe(true);
  });

  it('sends the right POST body to /api/quicktap/sessions', async () => {
    const fetchMock = makeFetchMock(
      async () =>
        new Response(streamFromEvents([SAMPLE_EVENTS[0]!, SAMPLE_EVENTS[12]!]), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/quicktap/sessions');
    const body = JSON.parse(String(init.body));
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients).toEqual(['miyagi-seri']);
    expect(body.sessionId).toMatch(/^sess_/);
  });

  it('transitions to error state on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(
        async () =>
          new Response(JSON.stringify({ error: { code: 'X', message: 'fail' } }), { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['x'] });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('500');
  });

  it('transitions to error state on network rejection', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(async () => {
        throw new Error('network down');
      }),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['x'] });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('network down');
  });

  it('reroll() POSTs to the reroll endpoint with the current sessionId', async () => {
    const REROLL_EVENTS: StreamEvent[] = [
      { type: 'session.start', sessionId: 'sess_y', strategies: ['exploit', 'tune', 'explore'] },
      { type: 'session.done', sessionId: 'sess_y' },
    ];
    const fetchMock = makeFetchMock(async (url) => {
      const body = url.includes('reroll') ? REROLL_EVENTS : SAMPLE_EVENTS;
      return new Response(streamFromEvents(body), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);

    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });
    expect(result.current.sessionId).toBe('sess_x');

    await act(async () => {
      await result.current.reroll('sess_x', { localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const rerollUrl = fetchMock.mock.calls[1]![0];
    expect(rerollUrl).toBe('/api/quicktap/sessions/sess_x/reroll');
    // Slice 7: reroll の context (localeId / ingredients) を body で送る
    const rerollOpts = fetchMock.mock.calls[1]![1] as { body?: string };
    expect(rerollOpts.body).toBeDefined();
    expect(JSON.parse(rerollOpts.body!)).toEqual({
      localeId: 'miyagi',
      ingredients: ['miyagi-seri'],
    });
    expect(result.current.sessionId).toBe('sess_y');
  });

  it('429 response on start() → error state RATE_LIMITED (Slice 9)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'RATE_LIMITED', message: '...', retryAfter: 1800 },
            }),
            { status: 429, headers: { 'retry-after': '1800' } },
          ),
      ),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);
    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['x'] });
    });
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toBe('RATE_LIMITED');
  });

  it('429 response on reroll() → error state RATE_LIMITED (Slice 9)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'RATE_LIMITED', message: '...', retryAfter: 600 },
            }),
            { status: 429, headers: { 'retry-after': '600' } },
          ),
      ),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);
    await act(async () => {
      await result.current.reroll('sess_x', { localeId: 'miyagi', ingredients: ['x'] });
    });
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toBe('RATE_LIMITED');
  });

  it('aborts the in-flight stream when the component unmounts', async () => {
    // ストリームが完了しないよう、1 イベント emit 後に閉じない ReadableStream を返す。
    // unmount 時に進行中の AbortController が abort されること (= signal.aborted) を検証する。
    function pendingStream(): ReadableStream<Uint8Array> {
      const enc = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(
            enc.encode(
              JSON.stringify({
                type: 'session.start',
                sessionId: 'sess_pending',
                strategies: ['exploit', 'tune', 'explore'],
              }) + '\n',
            ),
          );
          // close を呼ばない = ストリームは開いたまま
        },
      });
    }

    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      makeFetchMock(async (_url, init) => {
        capturedSignal = init?.signal ?? undefined;
        return new Response(pendingStream(), { status: 200 });
      }),
    );

    const { result, unmount } = renderHook(() => useQuickTapStream(), wrapperOption);

    act(() => {
      // 完了しないストリームなので await しない (start の Promise は解決しない)
      void result.current.start({ localeId: 'miyagi', ingredients: ['miyagi-seri'] });
    });

    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal!.aborted).toBe(false);

    unmount();

    expect(capturedSignal!.aborted).toBe(true);
  });

  it('reset() returns the hook to idle/empty', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(async () => new Response(streamFromEvents(SAMPLE_EVENTS), { status: 200 })),
    );

    const { result } = renderHook(() => useQuickTapStream(), wrapperOption);
    await act(async () => {
      await result.current.start({ localeId: 'miyagi', ingredients: ['x'] });
    });
    expect(result.current.candidates.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.candidates).toEqual([]);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
