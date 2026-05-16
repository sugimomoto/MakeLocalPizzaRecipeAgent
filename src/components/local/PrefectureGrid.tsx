/**
 * PrefectureGrid — 都道府県一覧を地域別にグループ化して表示。
 *
 * Slice 1 では 47 都道府県の網羅は持たず、与えられた locales を地域でグループする。
 * (実データは agent/data/ingredients.yaml の 3 件のみだが、コンポーネント自体は汎用)
 *
 * 上部に RegionChip で地域フィルタ、下部にタイル状の都道府県ボタン。
 */

import { REGIONS } from '@/domain/locale';

import styles from './PrefectureGrid.module.css';
import { RegionChip } from './RegionChip';

import type { Locale, Region } from '@/domain/locale';

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

export type PrefectureGridProps = {
  locales: Locale[];
  selectedLocaleId: string | null;
  onSelectLocale: (localeId: string) => void;
  /** 地域フィルタ。null は全表示。state は呼び出し側で持つ。 */
  regionFilter?: Region | null;
  onChangeRegionFilter?: (region: Region | null) => void;
};

export function PrefectureGrid({
  locales,
  selectedLocaleId,
  onSelectLocale,
  regionFilter = null,
  onChangeRegionFilter,
}: PrefectureGridProps) {
  // 地域でグループ化
  const grouped = new Map<Region, Locale[]>();
  for (const r of REGIONS) grouped.set(r, []);
  for (const l of locales) {
    const list = grouped.get(l.region);
    if (list) list.push(l);
  }
  // 並びは prefecture 名 50 音順
  for (const list of grouped.values()) {
    list.sort((a, b) => a.prefecture.localeCompare(b.prefecture, 'ja'));
  }

  const visibleRegions = regionFilter ? [regionFilter] : REGIONS;

  return (
    <div className={styles.container}>
      {onChangeRegionFilter && (
        <div className={styles.grid} role="group" aria-label="地域フィルタ">
          <RegionChip region={null} active={regionFilter === null} onClick={onChangeRegionFilter} />
          {REGIONS.map((r) => (
            <RegionChip
              key={r}
              region={r}
              active={regionFilter === r}
              onClick={onChangeRegionFilter}
            />
          ))}
        </div>
      )}

      {visibleRegions.map((region) => {
        const list = grouped.get(region) ?? [];
        if (list.length === 0 && regionFilter !== region) return null;
        return (
          <section key={region} className={styles.regionGroup} aria-label={REGION_LABEL[region]}>
            <h3 className={styles.regionLabel}>{REGION_LABEL[region]}</h3>
            {list.length === 0 ? (
              <p className={styles.empty}>(対応データなし)</p>
            ) : (
              <div className={styles.grid}>
                {list.map((locale) => {
                  const isSelected = locale.id === selectedLocaleId;
                  return (
                    <button
                      key={locale.id}
                      type="button"
                      className={[styles.tile, isSelected ? styles.selected : null]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={isSelected}
                      onClick={() => onSelectLocale(locale.id)}
                    >
                      {locale.prefecture}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
