import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeNdjsonStream } from '@/lib/agent/stream';

import { useRecipeDetailStream } from './use-recipe-detail-stream';
import { ToastProvider } from './use-toast';

import type { Candidate } from '@/domain/candidate';
import type { StreamEvent } from '@/domain/schemas';
import type { ReactNode } from 'react';

// Slice 9: useRecipeDetailStream は内部で useToast を呼ぶため ToastProvider でラップ
function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
const wrapperOption = { wrapper: Wrapper };

const CANDIDATE: Candidate = {
  candidateId: 'c_test',
  strategy: 'exploit',
  title: '松島の牡蠣ピザ',
  concept: '海の旨味を素直に',
  keyIngredients: ['牡蠣', 'モッツァレラ'],
  sceneTags: ['週末家族'],
  why: '王道',
};

const HAPPY_EVENTS: StreamEvent[] = [
  { type: 'recipe.start', recipeId: 'c_test' },
  { type: 'image.start', recipeId: 'c_test' },
  { type: 'recipe.title', recipeId: 'c_test', title: '松島の牡蠣ピザ' },
  {
    type: 'recipe.meta',
    recipeId: 'c_test',
    meta: { servings: 'ピザ 1 枚分', duration: '45m', bakingTemp: '270°C', difficulty: '★★☆' },
  },
  {
    type: 'recipe.materials',
    recipeId: 'c_test',
    materials: [
      { name: '強力粉', quantity: '300g' },
      { name: '牡蠣', quantity: '10 個' },
      { name: 'モッツァレラ', quantity: '200g' },
    ],
  },
  {
    type: 'recipe.steps',
    recipeId: 'c_test',
    steps: ['生地を伸ばす', '牡蠣をのせる', '焼く'],
  },
  {
    type: 'recipe.story',
    recipeId: 'c_test',
    eyebrow: 'ゲストに語る',
    headline: '松島の夜。',
    body: '海と山の境界に置く一枚。',
  },
  { type: 'recipe.done', recipeId: 'c_test' },
  { type: 'image.ready', recipeId: 'c_test', url: 'https://storage.test/recipes/c_test.png' },
];

function streamFromEvents(events: StreamEvent[]): ReadableStream<Uint8Array> {
  async function* gen(): AsyncGenerator<StreamEvent> {
    for (const e of events) yield e;
  }
  return encodeNdjsonStream(gen());
}

function fetchMockFor(events: StreamEvent[], status = 200): ReturnType<typeof vi.fn> {
  return vi.fn(async () => new Response(streamFromEvents(events), { status }));
}

describe('useRecipeDetailStream', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle state with everything null', () => {
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);
    expect(result.current.state).toBe('idle');
    expect(result.current.title).toBeNull();
    expect(result.current.meta).toBeNull();
    expect(result.current.materials).toBeNull();
    expect(result.current.imageUrl).toBeNull();
  });

  it('happy path reaches allDone with title/meta/materials/steps/story/image populated', async () => {
    vi.stubGlobal('fetch', fetchMockFor(HAPPY_EVENTS));
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });

    await waitFor(() => expect(result.current.state).toBe('allDone'));
    expect(result.current.title).toBe('松島の牡蠣ピザ');
    expect(result.current.meta?.servings).toBe('ピザ 1 枚分');
    expect(result.current.materials?.length).toBe(3);
    expect(result.current.steps?.length).toBe(3);
    expect(result.current.story?.headline).toBe('松島の夜。');
    expect(result.current.imageUrl).toBe('https://storage.test/recipes/c_test.png');
    expect(result.current.imageError).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('image-only failure keeps recipe.done flow but records imageError', async () => {
    const events: StreamEvent[] = [
      ...HAPPY_EVENTS.filter((e) => e.type !== 'image.ready'),
      {
        type: 'image.error',
        recipeId: 'c_test',
        code: 'IMAGEN_FAIL',
        message: 'quota exceeded',
      },
    ];
    vi.stubGlobal('fetch', fetchMockFor(events));
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });

    await waitFor(() => expect(result.current.state).toBe('recipeDone'));
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.imageError).toContain('IMAGEN_FAIL');
    expect(result.current.error).toBeNull();
    expect(result.current.title).toBe('松島の牡蠣ピザ');
  });

  it('RECIPE_FAIL error event transitions to error state', async () => {
    const events: StreamEvent[] = [
      { type: 'recipe.start', recipeId: 'c_test' },
      { type: 'image.start', recipeId: 'c_test' },
      { type: 'error', code: 'RECIPE_FAIL', message: 'simulated gemini failure' },
      { type: 'image.ready', recipeId: 'c_test', url: 'https://storage.test/recipes/c_test.png' },
    ];
    vi.stubGlobal('fetch', fetchMockFor(events));
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toContain('simulated gemini failure');
  });

  it('non-2xx response is reported as error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toContain('500');
  });

  it('POSTs to /api/recipes/{candidateId} with full body', async () => {
    const fetchMock = fetchMockFor(HAPPY_EVENTS);
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c with space',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('/api/recipes/c%20with%20space');
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body.localeId).toBe('miyagi');
    expect(body.ingredients).toEqual(['miyagi-seri']);
    expect(body.candidate).toEqual(CANDIDATE);
  });

  it('429 response → error state with code "RATE_LIMITED" (Slice 9)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'RATE_LIMITED',
                message: 'しばらく時間をおいてから再度お試しください',
                retryAfter: 1800,
              },
            }),
            {
              status: 429,
              headers: { 'content-type': 'application/json', 'retry-after': '1800' },
            },
          ),
      ),
    );
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toBe('RATE_LIMITED');
  });

  it('reset() returns to idle', async () => {
    vi.stubGlobal('fetch', fetchMockFor(HAPPY_EVENTS));
    const { result } = renderHook(() => useRecipeDetailStream(), wrapperOption);

    await act(async () => {
      await result.current.start({
        candidateId: 'c_test',
        localeId: 'miyagi',
        ingredients: ['miyagi-seri'],
        candidate: CANDIDATE,
      });
    });
    await waitFor(() => expect(result.current.state).toBe('allDone'));

    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
    expect(result.current.title).toBeNull();
    expect(result.current.imageUrl).toBeNull();
  });
});
