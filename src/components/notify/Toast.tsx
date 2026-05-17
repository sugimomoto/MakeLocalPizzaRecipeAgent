/**
 * Toast — 単発の通知バー (3 トーン: success=朱 / info=藍 / warning=山吹)。
 * デザイン: design/slice4-screens.jsx の Toast 定義に準拠。
 *   - 14px radius / 14×16 padding / washi-deep 背景 / 左端 3px の accent-bar
 *   - icon (✓/ⓘ/⚠) は tone と同色、message は sumi gothic
 *   - auto=true なら下端に progress bar を表示 (時間ではなく装飾。実際の auto close は useToast 側で実施)
 *   - onDismiss が指定されれば × ボタンを出す
 */
import styles from './Toast.module.css';

import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'info' | 'warning';

export type ToastProps = {
  kind: ToastKind;
  message: ReactNode;
  auto?: boolean;
  onDismiss?: () => void;
};

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  info: 'ⓘ',
  warning: '⚠',
};

const TONE_CLASS: Record<ToastKind, string> = {
  success: styles.toneShu ?? '',
  info: styles.toneAi ?? '',
  warning: styles.toneYamabuki ?? '',
};

export function Toast({ kind, message, auto, onDismiss }: ToastProps): React.JSX.Element {
  const toneClass = TONE_CLASS[kind];
  return (
    <div className={`${styles.toast} ${toneClass}`} role="status" aria-live="polite">
      <span className={styles.bar} aria-hidden />
      <span className={styles.icon} aria-hidden>
        {ICONS[kind]}
      </span>
      <div className={styles.message}>{message}</div>
      {onDismiss && (
        <button type="button" className={styles.close} onClick={onDismiss} aria-label="閉じる">
          ✕
        </button>
      )}
      {auto && (
        <div className={styles.progressTrack} aria-hidden>
          <div className={styles.progressFill} />
        </div>
      )}
    </div>
  );
}
