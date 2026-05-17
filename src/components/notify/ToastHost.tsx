/**
 * ToastHost — 画面下中央 fixed に Toast を縦積みするコンテナ。
 * - 自身は pointer-events: none で背景クリックを通す (各 Toast は events: auto に戻す)
 * - role="region" + aria-label="通知" で screen reader にもまとめて告知
 * - useToast 側から push された items 配列を表示するだけのプレゼンテーション層
 */
import { Toast, type ToastKind } from './Toast';
import styles from './ToastHost.module.css';

import type { ReactNode } from 'react';

export type ToastHostItem = {
  id: string;
  kind: ToastKind;
  message: ReactNode;
  auto?: boolean;
};

export type ToastHostProps = {
  items: ReadonlyArray<ToastHostItem>;
  onDismiss?: (id: string) => void;
};

export function ToastHost({ items, onDismiss }: ToastHostProps): React.JSX.Element {
  return (
    <div className={styles.host} role="region" aria-label="通知">
      {items.map((t) => (
        <Toast
          key={t.id}
          kind={t.kind}
          message={t.message}
          {...(t.auto ? { auto: true as const } : {})}
          {...(onDismiss ? { onDismiss: () => onDismiss(t.id) } : {})}
        />
      ))}
    </div>
  );
}
