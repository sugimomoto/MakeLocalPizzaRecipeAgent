'use client';

/**
 * OvenProfileSheet — 機材プロファイル選択ボトムシート (Slice 8)
 *
 * 設計: design/slice8-app.jsx OvenProfileSheet @ L114
 *
 * - 2 ラジオオプション (ENRO / 家庭用オーブン)
 * - 仮選択 → 「この機材で続ける」CTA で確定 (誤タップ防止)
 * - 確定時に writeOvenProfile + Toast (4 秒) を発火する責務は親 (OvenProfileSelector) に集約
 * - シート自身は「現在の選択肢」「確定/破棄」のみを扱う
 */

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import { BottomSheet } from '@/components/primitives/BottomSheet';
import { OVEN_PROFILE_IDS, OVEN_PROFILES, type OvenProfileId } from '@/domain/oven-profile';

import styles from './OvenProfileSheet.module.css';

export type OvenProfileSheetProps = {
  open: boolean;
  /** 現在永続化されているプロファイル ID (シート初期値) */
  currentProfileId: OvenProfileId;
  /** 確定: 「この機材で続ける」押下時 */
  onConfirm: (id: OvenProfileId) => void;
  /** 破棄: Esc / 背面 click / × / ハンドル下スワイプ */
  onClose: () => void;
};

export function OvenProfileSheet({
  open,
  currentProfileId,
  onConfirm,
  onClose,
}: OvenProfileSheetProps): React.JSX.Element {
  const [draftId, setDraftId] = useState<OvenProfileId>(currentProfileId);
  const radioGroupId = useId();

  // 開かれるたびに、永続化値で draft を上書きする (別タブで切替されたケース対応)
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftId(currentProfileId);
    }
  }, [open, currentProfileId]);

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="機材プロファイルを選ぶ">
      <div className={styles.header}>
        <div className={styles.eyebrow}>EQUIPMENT PROFILE</div>
        <div className={styles.title}>機材を選ぶ</div>
        <p className={styles.lede}>
          選んだ機材に合わせて、レシピの <b>温度・時間</b> が再生成されます。
        </p>
      </div>

      <div className={styles.options} role="radiogroup" aria-labelledby={`${radioGroupId}-title`}>
        <span id={`${radioGroupId}-title`} className="sr-only">
          機材プロファイル
        </span>
        {OVEN_PROFILE_IDS.map((id) => {
          const profile = OVEN_PROFILES[id];
          const selected = draftId === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.option} ${selected ? styles['option--selected'] : ''}`}
              onClick={() => setDraftId(id)}
            >
              <div
                className={styles.optionEmoji}
                data-kind={id === 'enro_450c_90s' ? 'enro' : 'home'}
                aria-hidden
              >
                {profile.emoji}
              </div>
              <div className={styles.optionBody}>
                <div className={styles.optionTitleRow}>
                  <span className={styles.optionJp}>{profile.jp}</span>
                  {profile.recommended ? <span className={styles.optionBadge}>推奨</span> : null}
                </div>
                <div className={styles.optionEn}>{profile.en}</div>
                <div className={styles.optionMetrics}>
                  <span className={styles.metric}>
                    <span className={styles.metricLabel}>TEMP</span>
                    {profile.tempLine}
                  </span>
                  <span className={styles.metric}>
                    <span className={styles.metricLabel}>TIME</span>
                    {profile.timeLine}
                  </span>
                </div>
                <div className={styles.optionDesc}>{profile.desc}</div>
              </div>
              <div
                className={`${styles.radio} ${selected ? styles['radio--checked'] : ''}`}
                aria-hidden
              >
                {selected ? '✓' : null}
              </div>
            </button>
          );
        })}
      </div>

      <Link href="/equipment" className={styles.guideLink} onClick={onClose}>
        <span aria-hidden className={styles.guideLinkIcon}>
          📖
        </span>
        <span className={styles.guideLinkBody}>
          <span className={styles.guideLinkJp}>機材ガイドを見る</span>
          <span className={styles.guideLinkEn}>/equipment · ENRO の使い方と比較</span>
        </span>
        <span aria-hidden className={styles.guideLinkChev}>
          ›
        </span>
      </Link>

      <button type="button" className={styles.confirm} onClick={() => onConfirm(draftId)}>
        <span aria-hidden className={styles.confirmIcon}>
          ✓
        </span>
        この機材で続ける
      </button>
    </BottomSheet>
  );
}
