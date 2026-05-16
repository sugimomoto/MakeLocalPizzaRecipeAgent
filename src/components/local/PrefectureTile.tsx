/**
 * PrefectureTile — 都道府県を漢字一文字 + 県名 + ノートで表すタイル。
 *
 * バッジ:
 *   - isHome=true: 朱の「原体験」バッジ (ユーザの選択履歴がある県)
 *   - isCurated=false かつ selected=false: 「準備中」バッジ (食材データ未整備)
 *   - selected=true: 右上に check バッジ + 墨色塗りつぶし
 *
 * 同時表示の優先順位: selected (check) > home (原体験) > 準備中
 *
 * 元: design/prototype-app.jsx の LocalScreen 内タイル。
 */

import styles from './PrefectureTile.module.css';

import type { Prefecture } from '@/data/prefectures';

export type PrefectureTileProps = {
  prefecture: Prefecture;
  selected: boolean;
  isHome: boolean;
  onSelect: (id: string) => void;
};

export function PrefectureTile({ prefecture, selected, isHome, onSelect }: PrefectureTileProps) {
  const showHomeBadge = !selected && isHome;
  const showPendingBadge = !selected && !isHome && !prefecture.curated;

  return (
    <button
      type="button"
      className={[styles.tile, selected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-pressed={selected}
      aria-label={`${prefecture.prefecture}${isHome ? ' (原体験)' : ''}${prefecture.curated ? '' : ' 準備中'}`}
      onClick={() => onSelect(prefecture.id)}
    >
      {showHomeBadge && <span className={styles.homeBadge}>原体験</span>}
      {showPendingBadge && <span className={styles.pendingBadge}>準備中</span>}

      <div className={styles.kanji}>{prefecture.kanji}</div>
      <div className={styles.name}>{prefecture.prefecture}</div>
      <div className={styles.note}>{prefecture.note}</div>

      {selected && (
        <span className={styles.checkBadge} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
