'use client';

/**
 * useFurusatoItems — 詳細画面の食材リストに対応する楽天ふるさと納税返礼品を
 * Firestore から並列購読して 1 つの配列にまとめる (Slice 5)。
 *
 * 状態:
 *   { state: 'disabled',       items: [], error: null }  ← NEXT_PUBLIC_FURUSATO_INTEGRATION!='on'
 *   { state: 'loading',        items: [], error: null }  ← 初回購読の最初の snapshot 受信前
 *   { state: 'ready',          items: [...] }            ← 全 ingredient の snap が揃った
 *
 * - 各 ingredient_id について `subscribeFurusatoItems` を張り、結果を flatten
 * - 全 ingredient で donationAmount 昇順に sort
 * - TTL 切れ / cache miss は subscribe ヘルパが空配列を返す → flatten に影響しない
 * - 1 つでも error が発生したら `error` に最後の error を入れる (UI は warning Toast)
 */
import { useEffect, useState } from 'react';

import { getFirebaseDb } from '@/lib/firebase/client';
import { subscribeFurusatoItems } from '@/lib/firebase/furusato';

import type { FurusatoItem } from '@/domain/furusato';

export type FurusatoItemsState = 'disabled' | 'loading' | 'ready';

export type UseFurusatoItemsResult = {
  state: FurusatoItemsState;
  items: FurusatoItem[];
  error: Error | null;
};

function isEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FURUSATO_INTEGRATION === 'on';
}

export function useFurusatoItems(ingredientIds: readonly string[]): UseFurusatoItemsResult {
  const [state, setState] = useState<FurusatoItemsState>(() =>
    isEnabled() ? 'loading' : 'disabled',
  );
  const [items, setItems] = useState<FurusatoItem[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // ingredientIds は呼び出しごとに新しい配列が来るので、安定化のため join した文字列を deps に
  const joined = ingredientIds.join(',');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isEnabled()) {
      setState('disabled');
      setItems([]);
      setError(null);
      return;
    }
    // 空入力ならすぐ ready で空配列
    if (ingredientIds.length === 0) {
      setState('ready');
      setItems([]);
      setError(null);
      return;
    }

    setState('loading');
    setError(null);

    const db = getFirebaseDb();
    // 各 ingredient ごとの最新 snapshot を保持 (id → items[])
    const buckets = new Map<string, FurusatoItem[]>();
    let receivedFirstSnapshotCount = 0;

    function flush() {
      const all: FurusatoItem[] = [];
      for (const arr of buckets.values()) all.push(...arr);
      all.sort((a, b) => a.donationAmount - b.donationAmount);
      setItems(all);
      // 全 ingredient で 1 回以上 snapshot を受け取ったら ready
      if (receivedFirstSnapshotCount >= ingredientIds.length) {
        setState('ready');
      }
    }

    const unsubs: Array<() => void> = [];
    for (const id of ingredientIds) {
      let isFirst = true;
      const unsub = subscribeFurusatoItems(
        db,
        id,
        (next) => {
          buckets.set(id, next);
          if (isFirst) {
            receivedFirstSnapshotCount += 1;
            isFirst = false;
          }
          flush();
        },
        (err) => {
          setError(err);
        },
      );
      unsubs.push(unsub);
    }

    return () => {
      for (const u of unsubs) u();
    };
    /* eslint-enable react-hooks/set-state-in-effect */
    // joined が変わるたびに張り直す (ingredientIds の中身が変わったとき)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  return { state, items, error };
}
