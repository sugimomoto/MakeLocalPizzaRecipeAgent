'use client';

/**
 * useShare — Slice 10 共有 URL 発行用 client hook
 *
 * 状態:
 *   'idle'        : 初期 / 直近エラー後の復帰
 *   'publishing'  : POST /api/share 中
 *   'shared'      : 成功 (shareId / url を保持)
 *   'error'       : エラー
 *
 * 主な使い方:
 *   const share = useShare();
 *   await share.publish(payload);   // 成功すれば share.shareUrl が入る
 *
 * 429 は Toast に置く (`buildRateLimitToastMessage`)。
 * 他のエラーも Toast 経由でユーザに通知。
 *
 * NOTE: 同じレシピを 2 回 publish しても API 側がべき等で同 shareId を返す。
 */

import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/http/api-fetch';
import { buildRateLimitToastMessage } from '@/lib/rate-limit/toast';

import type { ShareRequest, ShareResponse } from '@/domain/share';

export type UseShareState = 'idle' | 'publishing' | 'shared' | 'error';

export type UseShareResult = {
  state: UseShareState;
  shareId: string | null;
  shareUrl: string | null;
  publish: (payload: ShareRequest) => Promise<ShareResponse | null>;
  reset: () => void;
};

export function useShare(): UseShareResult {
  const [state, setState] = useState<UseShareState>('idle');
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const toast = useToast();

  const publish = useCallback(
    async (payload: ShareRequest): Promise<ShareResponse | null> => {
      setState('publishing');
      try {
        const res = await apiFetch('/api/share', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.status === 429) {
          toast.push({
            kind: 'warning',
            message: buildRateLimitToastMessage(res, '/api/share'),
          });
          setState('error');
          return null;
        }
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          toast.push({
            kind: 'warning',
            message: `共有 URL の発行に失敗しました (${res.status})`,
          });
          if (detail) console.warn('[useShare] non-ok body', detail);
          setState('error');
          return null;
        }

        const data = (await res.json()) as ShareResponse;
        setShareId(data.shareId);
        setShareUrl(data.url);
        setState('shared');
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        toast.push({
          kind: 'warning',
          message: `共有 URL の発行に失敗しました (${msg})`,
        });
        setState('error');
        return null;
      }
    },
    [toast],
  );

  const reset = useCallback(() => {
    setShareId(null);
    setShareUrl(null);
    setState('idle');
  }, []);

  return { state, shareId, shareUrl, publish, reset };
}
