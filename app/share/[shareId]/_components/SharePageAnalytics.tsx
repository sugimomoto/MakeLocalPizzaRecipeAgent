'use client';

/**
 * SharePageAnalytics — Slice 10 公開ページマウント時の GA4 イベント送信
 *
 * 表示は何もしない。`<SharePageAnalytics shareId={...} />` を Server Component 経由で
 * 1 つ差し込むだけで `share_page_view` を 1 回送る。
 */
import { useEffect } from 'react';

import { trackEvent } from '@/lib/analytics/track';

export type SharePageAnalyticsProps = {
  shareId: string;
  prefecture: string;
  strategy: string;
};

export function SharePageAnalytics({
  shareId,
  prefecture,
  strategy,
}: SharePageAnalyticsProps): null {
  useEffect(() => {
    trackEvent('share_page_view', {
      share_id: shareId,
      prefecture,
      strategy,
    });
  }, [shareId, prefecture, strategy]);
  return null;
}
