'use client';

/**
 * useStreamController — NDJSON ストリーム hook の副作用 (AbortController ライフサイクル /
 * fetch / NDJSON 消費 / 429 ハンドリング / アンマウント時の中断) を共通化する基盤フック。
 *
 * state 形状と reducer はドメイン固有 (候補配列 vs 単一レシピ) のため各 hook に残し、
 * このフックは「制御アクション (`event` / `done` / `error`) を dispatch する副作用」だけを
 * 引き受ける。利用側 hook の Action union は必ず StreamControlAction を含むこと。
 *
 * 抽出元: useQuickTapStream / useRecipeDetailStream で重複していた consumeStream /
 * abortRef 管理 / 429 Toast / catch のパターン。あわせて **アンマウント時に進行中
 * ストリームを abort する** クリーンアップを追加した (旧実装には無く、unmount 後に
 * dispatch が走る race / リークがあった)。
 */

import { useCallback, useEffect, useRef } from 'react';

import { decodeNdjsonStream } from '@/lib/agent/stream';
import { buildRateLimitToastMessage } from '@/lib/rate-limit/toast';

import { useToast } from './use-toast';

import type { RateLimitRouteKey } from '@/lib/rate-limit/types';
import type { ZodType } from 'zod';

/** 各ストリーム hook の Action union が必ず含む制御アクション。 */
export type StreamControlAction<E> =
  | { type: 'event'; event: E }
  | { type: 'done' }
  | { type: 'error'; error: string };

export type RunOptions = {
  /** 429 Toast 用のルートキー (buildRateLimitToastMessage に渡す) */
  rateLimitRoute: RateLimitRouteKey;
};

export type UseStreamControllerResult = {
  /**
   * 既存ストリームを abort → fetchFn 実行 → 429 判定 → NDJSON 消費まで一括処理する。
   * fetchFn は AbortSignal を受け取り Response を返す (apiFetch をラップして渡す)。
   * dispatch('start') 等の state 初期化と trackEvent は呼び出し側で run の前に行う。
   */
  run: (fetchFn: (signal: AbortSignal) => Promise<Response>, opts: RunOptions) => Promise<void>;
  /** 進行中ストリームを中断する (reset / hydrate の前段で呼ぶ) */
  abort: () => void;
};

export function useStreamController<E>(
  schema: ZodType<E>,
  dispatch: React.Dispatch<StreamControlAction<E>>,
): UseStreamControllerResult {
  const abortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  // アンマウント時に進行中ストリームを中断する。decodeNdjsonStream のループは
  // 各イベント後に signal.aborted を見て return するため、これで unmount 後の
  // dispatch を止められる。
  useEffect(() => () => abortRef.current?.abort(), []);

  const consume = useCallback(
    async (res: Response): Promise<void> => {
      if (!res.ok || !res.body) {
        dispatch({ type: 'error', error: `HTTP ${res.status}` });
        return;
      }
      try {
        for await (const event of decodeNdjsonStream(res.body, schema)) {
          if (abortRef.current?.signal.aborted) return;
          dispatch({ type: 'event', event });
        }
        dispatch({ type: 'done' });
      } catch (err) {
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    [schema, dispatch],
  );

  const run = useCallback<UseStreamControllerResult['run']>(
    async (fetchFn, opts) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetchFn(ac.signal);
        // Slice 9: アプリ層レートリミットで 429 が返ったら Toast + error 状態に
        if (res.status === 429) {
          toast.push({
            kind: 'warning',
            message: buildRateLimitToastMessage(res, opts.rateLimitRoute),
          });
          dispatch({ type: 'error', error: 'RATE_LIMITED' });
          return;
        }
        await consume(res);
      } catch (err) {
        if (ac.signal.aborted) return;
        dispatch({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    [toast, consume, dispatch],
  );

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { run, abort };
}
