'use client';

/**
 * useFirestoreSubscription — 認証付き Firestore 単一購読の共通基盤フック。
 *
 * useSavedRecipes / useSavedRecipe で重複していた「Auth status による loading /
 * unauthenticated ゲート → user.uid で subscribe → unmount / 依存変化で unsubscribe →
 * error を state に捕捉」のパターンを抽出したもの。
 *
 * status の意味:
 *   'loading'         … Auth status='loading' 中、または認証済だが初回 snapshot 未着
 *   'unauthenticated' … 未サインイン (Firestore は触らない)
 *   'ready'           … 初回 snapshot 受信済 (data は購読結果。doc 不在なら null)
 *
 * data の型 T は購読関数が onData に渡す型 (コレクションなら配列、単一 doc なら `X | null`)。
 * subscribe は **参照安定** であること (effect 依存に入るため呼び出し側で useCallback する)。
 *
 * NOTE: dual-subscription や「エラー時も settled 扱いにする」useFeedback、複数 ID を
 * 並列購読する useFurusatoItems は形状が異なるため本基盤の対象外 (各 hook に据え置き)。
 */

import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getFirebaseDb } from '@/lib/firebase/client';

import type { Firestore } from 'firebase/firestore';

export type FirestoreSubscriptionStatus = 'loading' | 'unauthenticated' | 'ready';

export type FirestoreSubscribeFn<T> = (
  db: Firestore,
  uid: string,
  onData: (data: T) => void,
  onError: (err: Error) => void,
) => () => void;

export type UseFirestoreSubscriptionResult<T> = {
  status: FirestoreSubscriptionStatus;
  data: T | null;
  error: Error | null;
};

export function useFirestoreSubscription<T>(
  subscribe: FirestoreSubscribeFn<T>,
): UseFirestoreSubscriptionResult<T> {
  const { status: authStatus, user } = useAuth();
  const [status, setStatus] = useState<FirestoreSubscriptionStatus>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 入力 (authStatus / user / subscribe) の変化に応じた純粋な再評価。
    // subscribe の lifecycle と setState を同じ effect に閉じ込めるのが最も読みやすいため、
    // React 19 の set-state-in-effect 警告は意図通り disable する。
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(null);

    if (authStatus === 'loading') {
      setStatus('loading');
      setData(null);
      return;
    }
    if (authStatus === 'unauthenticated' || !user) {
      setStatus('unauthenticated');
      setData(null);
      return;
    }

    const db = getFirebaseDb();
    const unsub = subscribe(
      db,
      user.uid,
      (next) => {
        setData(next);
        setStatus('ready');
      },
      (err) => {
        setError(err);
      },
    );
    return unsub;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [authStatus, user, subscribe]);

  return { status, data, error };
}
