/**
 * RegionChip — 地域 (8 区分) フィルタ用チップ。
 * PrefectureGrid 上部で使う想定。null は「すべて」。
 */

import styles from './PrefectureGrid.module.css';

import type { Region } from '@/domain/locale';

const REGION_LABEL: Record<Region, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  'kyushu-okinawa': '九州・沖縄',
};

export type RegionChipProps = {
  region: Region | null;
  active: boolean;
  onClick: (region: Region | null) => void;
};

export function RegionChip({ region, active, onClick }: RegionChipProps) {
  const label = region === null ? 'すべて' : REGION_LABEL[region];
  return (
    <button
      type="button"
      className={[styles.regionChip, active ? styles.regionChipActive : null]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={active}
      onClick={() => onClick(region)}
    >
      {label}
    </button>
  );
}
