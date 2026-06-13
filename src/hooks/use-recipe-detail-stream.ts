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

import { useCallback, useReducer } from 'react';

import { RecipeDetailStreamEventSchema, type RecipeDetailStreamEvent } from '@/domain/schemas';
import { apiFetch } from '@/lib/http/api-fetch';

import { useStreamController } from './use-stream-controller';

import type {
  RecipeDetailSnapshot,
  RecipeMaterial,
  RecipeMeta,
  RecipeStory,
} from '@/domain/recipe';
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
  | { type: 'reset' }
  | { type: 'hydrate'; snapshot: HydrateSnapshot };

/**
 * Slice 6: 保存済みスナップショットから state を一気に組み立てる用ペイロード。
 * ストリームを叩かず /library から開いたときに使う。
 *
 * Slice 7: lib/cache/stream-cache.ts でも同じ shape を使うため、型本体は
 * domain/recipe.ts の RecipeDetailSnapshot に集約。ここは hook 利用者向けの
 * 互換 alias。
 */
export type HydrateSnapshot = RecipeDetailSnapshot;

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
    case 'hydrate':
      // 保存済みスナップショットから state を一気に組み立てる (Slice 6)
      return {
        state: 'allDone',
        recipeId: action.snapshot.recipeId,
        title: action.snapshot.title,
        meta: action.snapshot.meta,
        materials: action.snapshot.materials,
        steps: action.snapshot.steps,
        story: action.snapshot.story,
        imageUrl: action.snapshot.imageUrl,
        imageError: null,
        error: null,
      };
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
  /** Slice 6: 保存済みスナップショットから即時に state を組み立てる (HTTP 呼ばない) */
  hydrate: (snapshot: HydrateSnapshot) => void;
  reset: () => void;
};

export function useRecipeDetailStream(): UseRecipeDetailStreamResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { run, abort } = useStreamController(RecipeDetailStreamEventSchema, dispatch);

  const start = useCallback(
    async (input: GenerateRecipeDetailInput) => {
      dispatch({ type: 'start', recipeId: input.candidateId });

      await run(
        (signal) =>
          apiFetch(`/api/recipes/${encodeURIComponent(input.candidateId)}`, {
            method: 'POST',
            body: JSON.stringify({
              localeId: input.localeId,
              ingredients: input.ingredients,
              candidate: input.candidate,
              // Slice 8: 機材プロファイル (省略時は API 側で ENRO に解決)
              ...(input.ovenProfile !== undefined && { ovenProfile: input.ovenProfile }),
            }),
            signal,
          }),
        { rateLimitRoute: '/api/recipes/[candidateId]' },
      );
    },
    [run],
  );

  const reset = useCallback(() => {
    abort();
    dispatch({ type: 'reset' });
  }, [abort]);

  const hydrate = useCallback(
    (snapshot: HydrateSnapshot) => {
      abort();
      dispatch({ type: 'hydrate', snapshot });
    },
    [abort],
  );

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
    hydrate,
    reset,
  };
}
