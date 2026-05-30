'use client';

/**
 * useOvenProfile — 端末ローカル (localStorage) の機材プロファイル ID を購読するフック。
 *
 * - SSR 中は DEFAULT_OVEN_PROFILE_ID を返し、isHydrated=false
 * - ハイドレーション後に localStorage の値を反映 → isHydrated=true
 * - setProfile は localStorage 書き込み + notify() で同期
 * - 同タブ内の他コンポーネントからの更新 + 別タブの 'storage' イベントの双方を購読
 *
 * 設計は useLocale (src/hooks/use-locale.ts) と同パターン。
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  DEFAULT_OVEN_PROFILE_ID,
  getOvenProfile,
  type OvenProfile,
  type OvenProfileId,
} from '@/domain/oven-profile';
import {
  OVEN_PROFILE_STORAGE_KEY,
  readOvenProfile,
  writeOvenProfile,
  type StoredOvenProfile,
} from '@/lib/localstorage/oven-profile';

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === OVEN_PROFILE_STORAGE_KEY || event.key === null) {
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

let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: StoredOvenProfile | null = null;

function notify(): void {
  cachedRaw = undefined;
  for (const l of listeners) l();
}

function getSnapshot(): StoredOvenProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(OVEN_PROFILE_STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = readOvenProfile();
  return cachedSnapshot;
}

function getServerSnapshot(): StoredOvenProfile | null {
  return null;
}

export type UseOvenProfileResult = {
  /** 現在選択中のプロファイル ID。localStorage が空ならデフォルト */
  profileId: OvenProfileId;
  /** 解決済の OvenProfile オブジェクト (UI 表示に直接使える) */
  profile: OvenProfile;
  /** ハイドレーション完了したか (SSR/CSR 整合用フラグ) */
  isHydrated: boolean;
  /** 任意タイムスタンプ (selectedAt) */
  selectedAt: number | null;
  /** プロファイルを切り替える (localStorage + 全購読者へ通知) */
  setProfile: (id: OvenProfileId) => void;
};

export function useOvenProfile(): UseOvenProfileResult {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  const profileId: OvenProfileId = stored?.id ?? DEFAULT_OVEN_PROFILE_ID;

  return {
    profileId,
    profile: getOvenProfile(profileId),
    isHydrated,
    selectedAt: stored?.selectedAt ?? null,
    setProfile: (id: OvenProfileId) => {
      writeOvenProfile(id);
      notify();
    },
  };
}
