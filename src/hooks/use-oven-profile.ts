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

import {
  DEFAULT_OVEN_PROFILE_ID,
  getOvenProfile,
  type OvenProfile,
  type OvenProfileId,
} from '@/domain/oven-profile';
import { createStorageStore } from '@/lib/localstorage/create-storage-store';
import {
  OVEN_PROFILE_STORAGE_KEY,
  readOvenProfile,
  writeOvenProfile,
  type StoredOvenProfile,
} from '@/lib/localstorage/oven-profile';

// モジュールスコープで 1 回だけ生成 (listeners / キャッシュを全コンシューマで共有)。
const ovenProfileStore = createStorageStore<StoredOvenProfile>({
  key: OVEN_PROFILE_STORAGE_KEY,
  read: readOvenProfile,
});

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
  const { value: stored, isHydrated } = ovenProfileStore.use();

  const profileId: OvenProfileId = stored?.id ?? DEFAULT_OVEN_PROFILE_ID;

  return {
    profileId,
    profile: getOvenProfile(profileId),
    isHydrated,
    selectedAt: stored?.selectedAt ?? null,
    setProfile: (id: OvenProfileId) => {
      writeOvenProfile(id);
      ovenProfileStore.notify();
    },
  };
}
