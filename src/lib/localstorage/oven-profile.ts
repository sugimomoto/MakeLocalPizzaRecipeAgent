/**
 * localStorage に「選択された機材プロファイル ID」を保存する R/W 関数。
 *
 * - キー: mlpr.ovenProfile.v1 (バージョン番号は将来のマイグレーション用)
 * - 値: { id: OvenProfileId; selectedAt: number(ms epoch) }
 * - 壊れた JSON / 未知の id は読み出し時に自動で破棄して null を返す
 * - SSR セーフ: window が無い環境では常に null
 *
 * Slice 8 で導入。`src/lib/localstorage/locale.ts` と同じ設計指針。
 */

import { isOvenProfileId, type OvenProfileId } from '@/domain/oven-profile';

export const OVEN_PROFILE_STORAGE_KEY = 'mlpr.ovenProfile.v1';

export type StoredOvenProfile = {
  id: OvenProfileId;
  selectedAt: number;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOvenProfile(): StoredOvenProfile | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(OVEN_PROFILE_STORAGE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'selectedAt' in parsed &&
      isOvenProfileId((parsed as { id: unknown }).id) &&
      typeof (parsed as StoredOvenProfile).selectedAt === 'number' &&
      Number.isFinite((parsed as StoredOvenProfile).selectedAt)
    ) {
      return {
        id: (parsed as StoredOvenProfile).id,
        selectedAt: (parsed as StoredOvenProfile).selectedAt,
      };
    }
    storage.removeItem(OVEN_PROFILE_STORAGE_KEY);
    return null;
  } catch {
    storage.removeItem(OVEN_PROFILE_STORAGE_KEY);
    return null;
  }
}

export function writeOvenProfile(id: OvenProfileId, now: number = Date.now()): void {
  const storage = getStorage();
  if (!storage) return;
  const value: StoredOvenProfile = { id, selectedAt: now };
  storage.setItem(OVEN_PROFILE_STORAGE_KEY, JSON.stringify(value));
}

export function clearOvenProfile(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(OVEN_PROFILE_STORAGE_KEY);
}
