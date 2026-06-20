'use client';

/**
 * useQuickTapStream — POST /api/quicktap/sessions と /reroll を呼び出して
 * NDJSON ストリームから Candidate を段階更新する React Hook。
 *
 * 状態遷移:
 *   idle → streaming → done   (正常終了)
 *           streaming → error (例外/サーバ 4xx5xx)
 *
 * 1 セッション内で 3 候補が並列にストリームされる。受信イベントごとに
 * 該当候補のフィールドを差分更新 (PartialCandidate)。
 */

import { useCallback, useReducer } from 'react';

import { CandidateStreamEventSchema, type CandidateStreamEvent } from '@/domain/schemas';
import { trackEvent } from '@/lib/analytics/track';
import { apiFetch } from '@/lib/http/api-fetch';

import { useStreamController } from './use-stream-controller';

import type { PartialCandidate } from '@/domain/candidate';
import type { GenerateCandidatesInput } from '@/lib/agent/client';

// PartialCandidate は domain/candidate.ts に移行 (lib/cache/stream-cache が
// 参照するため、レイヤー順序の都合)。後方互換のために hook 経由でも参照可能。
export type { PartialCandidate };

export type StreamState = 'idle' | 'streaming' | 'done' | 'error';

type State = {
  state: StreamState;
  sessionId: string | null;
  candidates: PartialCandidate[];
  error: string | null;
};

const initialState: State = {
  state: 'idle',
  sessionId: null,
  candidates: [],
  error: null,
};

type Action =
  | { type: 'start'; sessionId: string }
  | { type: 'event'; event: CandidateStreamEvent }
  | { type: 'done' }
  | { type: 'error'; error: string }
  | { type: 'reset' }
  | { type: 'hydrate'; sessionId: string; candidates: PartialCandidate[] };

function applyEvent(
  candidates: PartialCandidate[],
  event: CandidateStreamEvent,
): PartialCandidate[] {
  switch (event.type) {
    case 'session.start':
    case 'session.done':
    case 'error':
      return candidates;

    case 'candidate.start': {
      // 既存ならそのまま (重複防止)、なければ追加
      if (candidates.some((c) => c.candidateId === event.candidateId)) return candidates;
      return [
        ...candidates,
        {
          candidateId: event.candidateId,
          strategy: event.strategy,
          isDone: false,
        },
      ];
    }
    case 'candidate.title':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, title: event.title } : c,
      );
    case 'candidate.concept':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, concept: event.concept } : c,
      );
    case 'candidate.ingredients':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, keyIngredients: event.ingredients } : c,
      );
    case 'candidate.sceneTags':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, sceneTags: event.sceneTags } : c,
      );
    case 'candidate.why':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, why: event.why } : c,
      );
    case 'candidate.done':
      return candidates.map((c) =>
        c.candidateId === event.candidateId ? { ...c, isDone: true } : c,
      );
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return {
        state: 'streaming',
        sessionId: action.sessionId,
        candidates: [],
        error: null,
      };
    case 'event': {
      const next: State = {
        ...state,
        candidates: applyEvent(state.candidates, action.event),
      };
      // session.start で sessionId 上書き (server 側が確定値を返す可能性)
      if (action.event.type === 'session.start') {
        next.sessionId = action.event.sessionId;
      }
      // error イベントは error 状態に
      if (action.event.type === 'error') {
        next.state = 'error';
        next.error = action.event.message;
      }
      return next;
    }
    case 'done':
      return state.state === 'error' ? state : { ...state, state: 'done' };
    case 'error':
      return { ...state, state: 'error', error: action.error };
    case 'reset':
      return initialState;
    case 'hydrate':
      // sessionStorage キャッシュから即時に state を 'done' で復元 (Slice 7 リロード対策)
      return {
        state: 'done',
        sessionId: action.sessionId,
        candidates: action.candidates,
        error: null,
      };
  }
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID()}`;
  }
  return `sess_${Math.random().toString(36).slice(2, 14)}`;
}

export type UseQuickTapStreamResult = {
  state: StreamState;
  sessionId: string | null;
  candidates: PartialCandidate[];
  error: string | null;
  start: (input: GenerateCandidatesInput) => Promise<void>;
  reroll: (
    sessionId: string,
    context: { localeId: string; ingredients: string[] },
  ) => Promise<void>;
  reset: () => void;
  /** sessionStorage キャッシュから 'done' 状態で復元 (Slice 7 リロード対策) */
  hydrate: (sessionId: string, candidates: PartialCandidate[]) => void;
};

export function useQuickTapStream(): UseQuickTapStreamResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { run, abort } = useStreamController(CandidateStreamEventSchema, dispatch);

  const start = useCallback(
    async (input: GenerateCandidatesInput) => {
      const sessionId = generateSessionId();
      dispatch({ type: 'start', sessionId });
      trackEvent('generate_candidates', {
        mode: 'initial',
        prefecture: input.localeId,
        ingredients_count: input.ingredients.length,
      });

      await run(
        (signal) =>
          apiFetch('/api/quicktap/sessions', {
            method: 'POST',
            body: JSON.stringify({ ...input, sessionId }),
            signal,
          }),
        { rateLimitRoute: '/api/quicktap/sessions' },
      );
    },
    [run],
  );

  const reroll = useCallback(
    async (sourceSessionId: string, context: { localeId: string; ingredients: string[] }) => {
      dispatch({ type: 'start', sessionId: sourceSessionId });
      trackEvent('generate_candidates', {
        mode: 'reroll',
        prefecture: context.localeId,
        ingredients_count: context.ingredients.length,
      });

      await run(
        (signal) =>
          apiFetch(`/api/quicktap/sessions/${encodeURIComponent(sourceSessionId)}/reroll`, {
            method: 'POST',
            body: JSON.stringify(context),
            signal,
          }),
        { rateLimitRoute: '/api/quicktap/sessions/[id]/reroll' },
      );
    },
    [run],
  );

  const reset = useCallback(() => {
    abort();
    dispatch({ type: 'reset' });
  }, [abort]);

  const hydrate = useCallback(
    (sessionId: string, candidates: PartialCandidate[]) => {
      abort();
      dispatch({ type: 'hydrate', sessionId, candidates });
    },
    [abort],
  );

  return {
    state: state.state,
    sessionId: state.sessionId,
    candidates: state.candidates,
    error: state.error,
    start,
    reroll,
    reset,
    hydrate,
  };
}
