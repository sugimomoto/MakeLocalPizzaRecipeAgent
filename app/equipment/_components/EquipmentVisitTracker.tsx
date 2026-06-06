'use client';

/**
 * EquipmentVisitTracker — /equipment 訪問時の副作用をまとめる Client コンポーネント。
 *
 * - Dropdown の NEW バッジを抑制する localStorage フラグを立てる
 * - GA4 `view_equipment_guide` を 1 回送信
 *
 * クライアントマウント時に 1 回だけ実行。表示は何も出さない。
 */

import { useEffect } from 'react';

import { markEquipmentLinkSeen } from '@/components/shell/HeaderDropdown';
import { trackEvent } from '@/lib/analytics/track';

export function EquipmentVisitTracker(): null {
  useEffect(() => {
    markEquipmentLinkSeen();
    trackEvent('view_equipment_guide');

    // /equipment 内のアフィリエイトリンクは Server Component で描画している
    // `<a data-affiliate="enro">` 要素。Client component に切り出さずに済むよう
    // document click を delegation して位置 (hero / final-cta 等) と merchant
    // をタグに乗せる。capture フェーズでも middle click / cmd+click が拾える。
    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLElement>('[data-affiliate]');
      if (!link) return;
      const merchant = link.dataset.affiliate ?? 'unknown';
      const position = link.dataset.affiliatePosition ?? 'unknown';
      trackEvent('click_affiliate_link', {
        merchant,
        position,
        page: 'equipment',
      });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
