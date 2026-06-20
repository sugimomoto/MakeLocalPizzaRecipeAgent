'use client';

/**
 * useLocale — 端末ローカル (localStorage) の選択された地元 ID を React state として購読する。
 *
 * - SSR 中は { locale: null, isHydrated: false } を返す (SSR/CSR 不整合を避ける)
 * - ハイドレーション後に localStorage の値を反映 → isHydrated: true
 * - 同じタブ内の他コンポーネントからの setLocale で即座に再レンダー
 * - 別タブからの storage イベントにも追随 (localStorage 'storage' event)
 *
 * 内部実装: useSyncExternalStore で localStorage を subscribe。
 *
 * 注意: useLocale は localeId のみを保持する。Locale (prefecture など) の
 * 表示は呼び出し側で /api/locales のレスポンスと突き合わせる。
 */

import { createStorageStore } from '@/lib/localstorage/create-storage-store';
import {
  clearLocale as clearLocaleStorage,
  LOCALE_STORAGE_KEY,
  readLocale,
  writeLocale,
} from '@/lib/localstorage/locale';

import type { LocaleId } from '@/domain/locale';
import type { StoredLocale } from '@/lib/localstorage/locale';

// モジュールスコープで 1 回だけ生成 (listeners / キャッシュを全コンシューマで共有)。
const localeStore = createStorageStore<StoredLocale>({
  key: LOCALE_STORAGE_KEY,
  read: readLocale,
});

export type UseLocaleResult = {
  localeId: LocaleId | null;
  selectedAt: number | null;
  isHydrated: boolean;
  setLocale: (localeId: LocaleId) => void;
  clearLocale: () => void;
};

export function useLocale(): UseLocaleResult {
  const { value: stored, isHydrated } = localeStore.use();

  return {
    localeId: stored?.localeId ?? null,
    selectedAt: stored?.selectedAt ?? null,
    isHydrated,
    setLocale: (localeId) => {
      writeLocale(localeId);
      localeStore.notify();
    },
    clearLocale: () => {
      clearLocaleStorage();
      localeStore.notify();
    },
  };
}
