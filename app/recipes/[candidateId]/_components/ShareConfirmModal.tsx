'use client';

/**
 * ShareConfirmModal — 「X で共有」確定モーダル (Slice 10)
 *
 * - 表示中は body にスクロールロック
 * - ESC で閉じる、初期フォーカスは「キャンセル」(誤タップ防止)
 * - 「公開する」ボタンは publishing 中だけ disabled + ラベル切替
 * - 文言で「インターネット上に公開」「現バージョンでは取り消せない」を明記
 */
import { useEffect, useRef } from 'react';

import styles from './ShareConfirmModal.module.css';

export type ShareConfirmModalProps = {
  open: boolean;
  publishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ShareConfirmModal({
  open,
  publishing,
  onClose,
  onConfirm,
}: ShareConfirmModalProps): React.JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !publishing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, publishing, onClose]);

  if (!open) return null;
  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !publishing) onClose();
      }}
    >
      <div className={styles.panel}>
        <p className={styles.eyebrow}>SHARE TO X</p>
        <h2 id="share-confirm-title" className={styles.title}>
          このレシピを <span className={styles.shu}>X</span> で共有しますか？
        </h2>
        <p className={styles.body}>
          公開すると、<b>誰でも閲覧できる URL</b> がインターネット上に作成され、 X
          のタイムラインに画像入りカードで展開されます。
        </p>
        <p className={styles.note}>※ 現バージョンでは、公開した URL を取り消す機能はありません。</p>
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancel}
            onClick={onClose}
            disabled={publishing}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={publishing}
          >
            {publishing ? '公開中…' : '公開して X で共有'}
          </button>
        </div>
      </div>
    </div>
  );
}
