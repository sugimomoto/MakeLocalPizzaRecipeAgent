'use client';

/**
 * createStorageStore — localStorage の単一キーを `useSyncExternalStore` で購読する
 * ストアを生成するファクトリ。
 *
 * useLocale / useOvenProfile で丸ごと重複していた subscribe / getSnapshot (raw 文字列を
 * キーにしたスナップショットキャッシュ) / notify / listeners Set / getServerSnapshot /
 * isHydrated effect の機構を 1 箇所に集約する。getSnapshot は「同じ raw なら同じ参照を
 * 返す」必要があり、ここを取り違えると無限再レンダーやストア不整合を招くため、繊細な
 * この機構は共通化して 1 回だけ検証する価値がある。
 *
 * 各ストアは **モジュールスコープで 1 回だけ生成** すること (listeners / キャッシュを
 * 全コンシューマで共有するため)。読み書きのドメインロジック (read / write / parse) は
 * 呼び出し側の lib/localstorage/* に残し、本ファクトリは read 関数のみ受け取る。
 *
 * @param key   購読対象の localStorage キー
 * @param read  現在値を返す関数 (パース失敗時は null。例: readLocale)
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

type Listener = () => void;

export type StorageStore<T> = {
  /** 現在値 (SSR は null) と hydration 完了フラグを購読する React Hook。 */
  use: () => { value: T | null; isHydrated: boolean };
  /**
   * 値を書き換えた後に呼び、全購読者へ再評価を通知する。
   * 書き込み自体は呼び出し側 (writeLocale 等) が行い、その直後に notify する。
   */
  notify: () => void;
};

export function createStorageStore<T>(opts: {
  key: string;
  read: () => T | null;
}): StorageStore<T> {
  const { key, read } = opts;
  const listeners = new Set<Listener>();

  // getSnapshot は「同じ値なら同じ参照」を返す必要があるため、raw 文字列を
  // キーにスナップショットをキャッシュする (read() は毎回新規オブジェクトを生成する)。
  let cachedRaw: string | null | undefined = undefined; // undefined = 未初期化
  let cachedSnapshot: T | null = null;

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
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

  function getSnapshot(): T | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = read();
    return cachedSnapshot;
  }

  function getServerSnapshot(): T | null {
    return null;
  }

  function notify(): void {
    // 次の getSnapshot で再評価されるようキャッシュをクリアしてから全購読者へ通知。
    cachedRaw = undefined;
    for (const l of listeners) l();
  }

  function use(): { value: T | null; isHydrated: boolean } {
    const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    // hydration-safe: 初回 client render は SSR と同じく false。mount 後に true へ。
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
      setIsHydrated(true);
    }, []);
    return { value, isHydrated };
  }

  return { use, notify };
}
