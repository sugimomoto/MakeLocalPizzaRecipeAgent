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

import { useCallback, useReducer, useRef } from 'react';

import { decodeNdjsonStream } from '@/lib/agent/stream';

import type { Strategy } from '@/domain/candidate';
import type { StreamEvent } from '@/domain/schemas';
import type { GenerateCandidatesInput } from '@/lib/agent/client';

export type PartialCandidate = {
  candidateId: string;
  strategy: Strategy;
  title?: string;
  concept?: string;
  keyIngredients?: string[];
  sceneTags?: string[];
  why?: string;
  isDone: boolean;
};

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
  | { type: 'event'; event: StreamEvent }
  | { type: 'done' }
  | { type: 'error'; error: string }
  | { type: 'reset' };

function applyEvent(candidates: PartialCandidate[], event: StreamEvent): PartialCandidate[] {
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
  reroll: (sessionId?: string) => Promise<void>;
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
    for await (const event of decodeNdjsonStream(res.body)) {
      if (abortRef.current?.signal.aborted) return;
      dispatch({ type: 'event', event });
    }
    dispatch({ type: 'done' });
  } catch (err) {
    dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

export function useQuickTapStream(): UseQuickTapStreamResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (input: GenerateCandidatesInput) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const sessionId = generateSessionId();
    dispatch({ type: 'start', sessionId });

    try {
      const res = await fetch('/api/quicktap/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, sessionId }),
        signal: ac.signal,
      });
      await consumeStream(res, dispatch, abortRef);
    } catch (err) {
      if (ac.signal.aborted) return;
      dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const reroll = useCallback(
    async (sourceSessionId?: string) => {
      const sid = sourceSessionId ?? state.sessionId;
      if (!sid) {
        dispatch({ type: 'error', error: 'no source sessionId for reroll' });
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      dispatch({ type: 'start', sessionId: sid });

      try {
        const res = await fetch(`/api/quicktap/sessions/${encodeURIComponent(sid)}/reroll`, {
          method: 'POST',
          signal: ac.signal,
        });
        await consumeStream(res, dispatch, abortRef);
      } catch (err) {
        if (ac.signal.aborted) return;
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    [state.sessionId],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'reset' });
  }, []);

  return {
    state: state.state,
    sessionId: state.sessionId,
    candidates: state.candidates,
    error: state.error,
    start,
    reroll,
    reset,
  };
}
