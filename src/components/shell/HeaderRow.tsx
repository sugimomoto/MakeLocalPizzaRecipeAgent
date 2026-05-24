'use client';

/**
 * HeaderRow — 全画面共通の TOP 戻る + タイトル + 右スロット (Slice 7)
 *
 * 設計: design/slice7-screens.jsx HeaderRow7 @ L42
 *
 * - 左: HomeChip (`onBack` 未指定なら `router.push('/')`)。
 *   旧 ChevronLeft (1 つ前に戻る) は連続 push されたフローで戻り先が
 *   不自然になることが多く、ユーザ要望で「TOP に戻る」ホームアイコンに変更。
 * - 中央: brand (mono 9px shu) + title (mincho 16px sumi)
 * - 右: 任意の rightSlot (通常は AvatarButton)
 * - dark プロパティで Detail 画面など暗色背景向けに色反転
 *
 * 注: TOP (/) には適用しない (ヒーロー画面が崩れるため、各画面側で出し分け)。
 */

import { useRouter } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';

import styles from './HeaderRow.module.css';

export type HeaderRowProps = {
  /** 中央タイトル (必須)。template 由来の重複は親 page.tsx で吸収済 */
  title: string;
  /** 任意の brand 表記 (例: "ふるさとピザ帳") */
  brand?: string;
  /** ホーム (TOP) ボタン押下時のハンドラ。未指定なら router.push('/') */
  onBack?: () => void;
  /** ホームボタンを非表示にする (TOP 等)。デフォルト false */
  hideBack?: boolean;
  /** 右側スロット (通常 AvatarButton) */
  rightSlot?: ReactNode;
  /** 暗色背景 (DetailClient のヒーロー上に被せる時) */
  dark?: boolean;
};

function HomeIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1v-8.5z"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeaderRow({
  title,
  brand,
  onBack,
  hideBack = false,
  rightSlot,
  dark = false,
}: HeaderRowProps): React.JSX.Element {
  const router = useRouter();
  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else router.push('/');
  }, [onBack, router]);

  const chipClass = [
    styles.backChip,
    dark && styles['backChip--dark'],
    hideBack && styles['backChip--hidden'],
  ]
    .filter(Boolean)
    .join(' ');
  const barClass = [styles.bar, dark && styles['bar--dark']].filter(Boolean).join(' ');
  const titleClass = [
    styles.title,
    !brand && styles['title--noBrand'],
    dark && styles['title--dark'],
  ]
    .filter(Boolean)
    .join(' ');
  const brandClass = [styles.brand, dark && styles['brand--dark']].filter(Boolean).join(' ');

  return (
    <div className={styles.wrapper}>
      <div className={barClass}>
        <button
          type="button"
          className={chipClass}
          onClick={handleBack}
          aria-label="TOP に戻る"
          aria-hidden={hideBack || undefined}
          tabIndex={hideBack ? -1 : 0}
        >
          <HomeIcon color={dark ? '#FBF7ED' : '#1F1A12'} />
        </button>

        <div className={styles.center}>
          {brand ? <div className={brandClass}>{brand}</div> : null}
          <div className={titleClass}>{title}</div>
        </div>

        <div className={styles.right}>{rightSlot}</div>
      </div>
    </div>
  );
}
