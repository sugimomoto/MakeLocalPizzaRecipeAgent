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

import { useSyncExternalStore } from 'react';

import {
  clearLocale as clearLocaleStorage,
  LOCALE_STORAGE_KEY,
  readLocale,
  writeLocale,
} from '@/lib/localstorage/locale';

import type { LocaleId } from '@/domain/locale';
import type { StoredLocale } from '@/lib/localstorage/locale';

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) {
      listener();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

// useSyncExternalStore の getSnapshot は **同じ値なら同じ参照を返す** 必要がある。
// readLocale() は毎回新しいオブジェクトを生成するため、raw 文字列をキーにキャッシュする。
let cachedRaw: string | null | undefined = undefined; // undefined = 未初期化
let cachedSnapshot: StoredLocale | null = null;

function notify(): void {
  // ストアの変化を検知させるため、次の getSnapshot で再評価されるようにキャッシュをクリア
  cachedRaw = undefined;
  for (const l of listeners) l();
}

function getSnapshot(): StoredLocale | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = readLocale();
  return cachedSnapshot;
}

function getServerSnapshot(): StoredLocale | null {
  // SSR 中は常に null
  return null;
}

export type UseLocaleResult = {
  localeId: LocaleId | null;
  selectedAt: number | null;
  isHydrated: boolean;
  setLocale: (localeId: LocaleId) => void;
  clearLocale: () => void;
};

export function useLocale(): UseLocaleResult {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // useSyncExternalStore は SSR 中は getServerSnapshot を返し、
  // クライアントで mount 後 getSnapshot に切り替わる → その時点で hydrated とみなす
  const isHydrated = typeof window !== 'undefined';

  return {
    localeId: stored?.localeId ?? null,
    selectedAt: stored?.selectedAt ?? null,
    isHydrated,
    setLocale: (localeId) => {
      writeLocale(localeId);
      notify();
    },
    clearLocale: () => {
      clearLocaleStorage();
      notify();
    },
  };
}
