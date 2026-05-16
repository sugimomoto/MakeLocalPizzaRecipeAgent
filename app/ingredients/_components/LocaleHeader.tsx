'use client';

/**
 * LocaleHeader — Tap2 (食材選択) 上部の「📍 [地元名] ▾」表示。
 * クリックで /local に戻って地元を変更できる (§4.1-7 受け入れ条件)。
 *
 * locales は呼び出し側から受け取る (このコンポーネントは fetch しない)。
 * 未取得なら "..." を表示。
 */

import { useRouter } from 'next/navigation';

import styles from './LocaleHeader.module.css';

import type { Locale } from '@/domain/locale';

export type LocaleHeaderProps = {
  localeId: string | null;
  locales: Locale[] | null;
};

export function LocaleHeader({ localeId, locales }: LocaleHeaderProps) {
  const router = useRouter();
  const locale = localeId && locales ? locales.find((l) => l.id === localeId) : null;
  const display = locale?.prefecture ?? (localeId ? '...' : '未選択');

  return (
    <button
      type="button"
      className={styles.header}
      onClick={() => router.push('/local')}
      aria-label={`地元: ${display} (タップで変更)`}
    >
      <span className={styles.pin} aria-hidden="true">
        📍
      </span>
      <span className={localeId ? '' : styles.empty}>{display}</span>
      <span className={styles.chevron} aria-hidden="true">
        ▾
      </span>
    </button>
  );
}
