'use client';

/**
 * BottomSheet — iOS 風ボトムシート (Slice 8)
 *
 * 背面ディム + 角丸 22px の washi sheet + ドラッグハンドル。
 * Esc / 背面 click / × ボタン / ハンドル下スワイプで onClose 発火。
 *
 * 設計: design/slice8-app.jsx OvenProfileSheet @ L114
 *
 * a11y: role="dialog" aria-modal="true"。フォーカストラップは MVP では入れない
 * (Slice 8 のシートが 2 ラジオ + 1 CTA で十分小規模なため)。
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import styles from './BottomSheet.module.css';

export type BottomSheetProps = {
  /** マウントされていてかつ開いていれば true */
  open: boolean;
  /** 閉じる契機 (Esc / 背面 click / × ボタン / 下スワイプ) */
  onClose: () => void;
  /** aria-label (シートの目的、例: "機材プロファイル選択") */
  ariaLabel: string;
  /** ヘッダ行右側に表示する閉じるボタンを出すか */
  showCloseButton?: boolean;
  children: ReactNode;
};

/** ハンドル下スワイプ判定の閾値 (px) */
const SWIPE_CLOSE_THRESHOLD = 40;

export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  showCloseButton = true,
  children,
}: BottomSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // Esc キー
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 背面スクロール抑止 (body の overflow を一時的に hidden)
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const onBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const onHandleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onHandleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const current = e.touches[0]?.clientY ?? dragStartY.current;
    const offset = Math.max(0, current - dragStartY.current);
    setDragOffset(offset);
  };
  const onHandleTouchEnd = () => {
    if (dragOffset >= SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
    setDragOffset(0);
    dragStartY.current = null;
  };

  if (!open) return null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="シートを閉じる"
        onClick={onBackdropClick}
        tabIndex={-1}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`${styles.sheet} mlpr-washi-noise mlpr-washi-noise--canvas`}
        style={{ transform: `translateY(${dragOffset}px)` }}
      >
        <div
          className={styles.handleArea}
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className={styles.handle} aria-hidden />
        </div>
        {showCloseButton ? (
          <button
            type="button"
            className={styles.closeButton}
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
