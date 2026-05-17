'use client';

/**
 * useRecipeDetailStream — POST /api/recipes/[candidateId] を呼んで
 * NDJSON ストリームから 1 件の詳細レシピと画像を段階的に組み立てる Hook。
 *
 * 状態遷移:
 *   idle → streaming → recipeDone → allDone (正常)
 *           streaming → error (例外/サーバ 4xx5xx/RECIPE_FAIL)
 *
 * 画像失敗 (image.error) は state を変えず imageError に格納するだけ
 * (テキストは表示できるので画面は成立する)。
 */

import { useCallback, useReducer, useRef } from 'react';

import { RecipeDetailStreamEventSchema, type RecipeDetailStreamEvent } from '@/domain/schemas';
import { decodeNdjsonStream } from '@/lib/agent/stream';

import type { RecipeMaterial, RecipeMeta, RecipeStory } from '@/domain/recipe';
import type { GenerateRecipeDetailInput } from '@/lib/agent/client';

export type RecipeDetailStreamState = 'idle' | 'streaming' | 'recipeDone' | 'allDone' | 'error';

type State = {
  state: RecipeDetailStreamState;
  recipeId: string | null;
  title: string | null;
  meta: RecipeMeta | null;
  materials: RecipeMaterial[] | null;
  steps: string[] | null;
  story: RecipeStory | null;
  imageUrl: string | null;
  imageError: string | null;
  error: string | null;
};

const initialState: State = {
  state: 'idle',
  recipeId: null,
  title: null,
  meta: null,
  materials: null,
  steps: null,
  story: null,
  imageUrl: null,
  imageError: null,
  error: null,
};

type Action =
  | { type: 'start'; recipeId: string }
  | { type: 'event'; event: RecipeDetailStreamEvent }
  | { type: 'done' }
  | { type: 'error'; error: string }
  | { type: 'reset' };

function applyEvent(state: State, event: RecipeDetailStreamEvent): State {
  switch (event.type) {
    case 'recipe.start':
      return { ...state, recipeId: event.recipeId };
    case 'recipe.title':
      return { ...state, title: event.title };
    case 'recipe.meta':
      return { ...state, meta: event.meta };
    case 'recipe.materials':
      return { ...state, materials: event.materials };
    case 'recipe.steps':
      return { ...state, steps: event.steps };
    case 'recipe.story':
      return {
        ...state,
        story: { eyebrow: event.eyebrow, headline: event.headline, body: event.body },
      };
    case 'recipe.done': {
      // 画像がもう届いていれば allDone、それ以外は recipeDone (画像待ち)
      const next: RecipeDetailStreamState = state.imageUrl ? 'allDone' : 'recipeDone';
      return { ...state, state: next };
    }
    case 'image.start':
      return state;
    case 'image.ready': {
      const next: RecipeDetailStreamState =
        state.state === 'recipeDone' || state.state === 'allDone' ? 'allDone' : state.state;
      return { ...state, imageUrl: event.url, state: next };
    }
    case 'image.error':
      return { ...state, imageError: `${event.code}: ${event.message}` };
    case 'error':
      return { ...state, state: 'error', error: event.message };
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { ...initialState, state: 'streaming', recipeId: action.recipeId };
    case 'event':
      return applyEvent(state, action.event);
    case 'done':
      // ストリーム自体は終わったが、recipe.done が来ていなければそのまま (error / streaming のまま)
      if (state.state === 'streaming') {
        // recipe.done を見ないまま終了 → エラー扱い
        return { ...state, state: 'error', error: 'stream ended before recipe.done' };
      }
      // recipeDone のまま終わったら画像が間に合わなかったケース。allDone に昇格はしない。
      return state;
    case 'error':
      return { ...state, state: 'error', error: action.error };
    case 'reset':
      return initialState;
  }
}

export type UseRecipeDetailStreamResult = {
  state: RecipeDetailStreamState;
  recipeId: string | null;
  title: string | null;
  meta: RecipeMeta | null;
  materials: RecipeMaterial[] | null;
  steps: string[] | null;
  story: RecipeStory | null;
  imageUrl: string | null;
  imageError: string | null;
  error: string | null;
  start: (input: GenerateRecipeDetailInput) => Promise<void>;
  reset: () => void;
};

async function consumeStream(
  res: Response,
  dispatch: React.Dispatch<Action>,
  abortRef: React.RefObject<AbortController | null>,
): Promise<void> {
  if (!res.ok || !res.body) {
    dispatch({ type: 'error', error: `HTTP ${res.status}` });
    return;
  }
  try {
    for await (const event of decodeNdjsonStream(res.body, RecipeDetailStreamEventSchema)) {
      if (abortRef.current?.signal.aborted) return;
      dispatch({ type: 'event', event });
    }
    dispatch({ type: 'done' });
  } catch (err) {
    dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

export function useRecipeDetailStream(): UseRecipeDetailStreamResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (input: GenerateRecipeDetailInput) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    dispatch({ type: 'start', recipeId: input.candidateId });

    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(input.candidateId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          localeId: input.localeId,
          ingredients: input.ingredients,
          candidate: input.candidate,
        }),
        signal: ac.signal,
      });
      await consumeStream(res, dispatch, abortRef);
    } catch (err) {
      if (ac.signal.aborted) return;
      dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'reset' });
  }, []);

  return {
    state: state.state,
    recipeId: state.recipeId,
    title: state.title,
    meta: state.meta,
    materials: state.materials,
    steps: state.steps,
    story: state.story,
    imageUrl: state.imageUrl,
    imageError: state.imageError,
    error: state.error,
    start,
    reset,
  };
}
