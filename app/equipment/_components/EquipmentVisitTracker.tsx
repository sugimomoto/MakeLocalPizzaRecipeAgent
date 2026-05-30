'use client';

/**
 * EquipmentVisitTracker — /equipment 訪問時に localStorage フラグを立てる
 *
 * Dropdown の「NEW」バッジを抑制するためのトラッカー。
 * クライアントマウント時に 1 回だけ実行。表示は何も出さない。
 */

import { useEffect } from 'react';

import { markEquipmentLinkSeen } from '@/components/shell/HeaderDropdown';

export function EquipmentVisitTracker(): null {
  useEffect(() => {
    markEquipmentLinkSeen();
  }, []);
  return null;
}
