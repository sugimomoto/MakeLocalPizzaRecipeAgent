/**
 * RegionRail — 9 地域 (北海道 ... 沖縄) を横スクロールで並べるナビ。
 * active 地域は墨色塗りつぶしで強調。クリックでセクションへスクロール (呼び出し側の責務)。
 *
 * design/prototype-app.jsx の LocalScreen 上部の region quick-jump rail に相当。
 */

import {
  PREFECTURE_REGION_LABEL,
  PREFECTURE_REGION_ORDER,
  type PrefectureRegion,
} from '@/data/prefectures';

import styles from './RegionRail.module.css';

export type RegionRailProps = {
  active: PrefectureRegion;
  onJump: (region: PrefectureRegion) => void;
};

export function RegionRail({ active, onJump }: RegionRailProps) {
  return (
    <nav className={styles.rail} aria-label="地域ナビ" role="tablist">
      {PREFECTURE_REGION_ORDER.map((r) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={[styles.chip, isActive ? styles.active : null].filter(Boolean).join(' ')}
            onClick={() => onJump(r)}
          >
            {PREFECTURE_REGION_LABEL[r]}
          </button>
        );
      })}
    </nav>
  );
}
