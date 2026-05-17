/**
 * GoogleButton — Google ブランドガイドラインに準拠したサインインボタン。
 * 仕様: design/slice4-screens.jsx の GoogleButton 定義
 *   - 高さ 50 / radius 999 / 白背景 / 4 色 G ロゴ + Roboto
 *   - ラベル既定値 'Google で続ける'
 */
import styles from './GoogleButton.module.css';

import type { ButtonHTMLAttributes } from 'react';

export type GoogleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label?: string;
};

function GoogleGMark(): React.JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      aria-hidden
      focusable="false"
      className={styles.mark}
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.81 5.95-2.19l-2.9-2.26c-.81.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3.02-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .95 4.97L3.97 7.3C4.68 5.18 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleButton({
  label = 'Google で続ける',
  className,
  type = 'button',
  ...rest
}: GoogleButtonProps): React.JSX.Element {
  return (
    <button type={type} className={`${styles.button} ${className ?? ''}`.trim()} {...rest}>
      <GoogleGMark />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
