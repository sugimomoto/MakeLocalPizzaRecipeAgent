/**
 * localStorage に「選択された地元 ID」を保存する R/W 関数。
 *
 * - キー: mlpr.locale.v1 (バージョン番号は将来のマイグレーション用)
 * - 値: { localeId: string; selectedAt: number(ms epoch) }
 * - 壊れた JSON は読み出し時に自動で破棄して null を返す (リカバリ動作)
 * - SSR セーフ: window が無い環境では常に null
 */

import type { LocaleId } from '@/domain/locale';

export const LOCALE_STORAGE_KEY = 'mlpr.locale.v1';

export type StoredLocale = {
  localeId: LocaleId;
  selectedAt: number;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // Safari プライベートモード等で localStorage アクセスが拒否されるケース
    return null;
  }
}

export function readLocale(): StoredLocale | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(LOCALE_STORAGE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'localeId' in parsed &&
      'selectedAt' in parsed &&
      typeof (parsed as StoredLocale).localeId === 'string' &&
      (parsed as StoredLocale).localeId.length > 0 &&
      typeof (parsed as StoredLocale).selectedAt === 'number' &&
      Number.isFinite((parsed as StoredLocale).selectedAt)
    ) {
      return {
        localeId: (parsed as StoredLocale).localeId,
        selectedAt: (parsed as StoredLocale).selectedAt,
      };
    }
    // 形が壊れている場合はキーごと削除
    storage.removeItem(LOCALE_STORAGE_KEY);
    return null;
  } catch {
    // JSON parse 失敗時もキーごと削除
    storage.removeItem(LOCALE_STORAGE_KEY);
    return null;
  }
}

export function writeLocale(localeId: LocaleId, now: number = Date.now()): void {
  const storage = getStorage();
  if (!storage) return;
  const value: StoredLocale = { localeId, selectedAt: now };
  storage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(value));
}

export function clearLocale(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(LOCALE_STORAGE_KEY);
}
