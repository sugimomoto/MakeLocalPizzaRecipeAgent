'use client';

/**
 * CameraPlaceholder — Slice 8 で実装予定の写真添付のプレースホルダ。
 * クリックで info Toast「写真の添付は Slice 8 で対応します」を出す。
 */

import { useToast } from '@/hooks/use-toast';

import styles from './CameraPlaceholder.module.css';

import type { JSX } from 'react';

function CameraIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M4 7h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zm8 3.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CameraPlaceholder(): JSX.Element {
  const toast = useToast();
  return (
    <button
      type="button"
      className={styles.button}
      aria-label="写真を添付 (準備中)"
      onClick={() =>
        toast.push({
          kind: 'info',
          message: '写真の添付は近日対応します。今回は文章だけで記録できます。',
        })
      }
    >
      <CameraIcon size={16} />
      <span className={styles.comingSoon}>準備中</span>
    </button>
  );
}
