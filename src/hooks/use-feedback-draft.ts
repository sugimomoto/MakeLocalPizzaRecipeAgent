'use client';

/**
 * useFeedbackDraft — フォーム値の変更を debounce で自動保存 (Slice 7)
 *
 * - 3 秒 debounce で `saveDraft(uid, candidateId, partial)` を呼ぶ
 * - 直近の保存値と現在値が同じならスキップ (quota 節約)
 * - 未サインインなら localStorage にだけ mirror (Firestore は触らない)
 * - `lastSavedAt` を返して UI の「自動保存 N 秒前」表示に使う
 *
 * 設計上、useFeedback と疎結合 — 初期値の hydrate は useFeedback の役目で、
 * このフックは「現在値を保存する」だけを担う。
 */

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { getFirebaseDb } from '@/lib/firebase/client';
import { saveDraft } from '@/lib/firebase/feedback';

import type { FeedbackFormValue } from './use-feedback';

const DEBOUNCE_MS = 3000;

/** localStorage キー (未サインイン時の値復元用) */
function draftStorageKey(candidateId: string): string {
  return `mlpr.feedbackDraft.${candidateId}.v1`;
}

export type UseFeedbackDraftResult = {
  /** 最終 saveDraft 成功時刻 (UI の「自動保存 N 秒前」用) */
  lastSavedAt: Date | null;
  /** 手動 reset (submit 成功時に呼ぶ) */
  reset: () => void;
};

/**
 * @param candidateId   レシピ識別子 (drafts/{candidateId} に保存)
 * @param values        現在のフォーム値 (changes を検知する対象)
 * @param enabled       false なら何もしない (e.g. submit 中)
 */
export function useFeedbackDraft(
  candidateId: string,
  values: FeedbackFormValue,
  enabled = true,
): UseFeedbackDraftResult {
  const { user } = useAuth();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSerializedRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(values);
    if (serialized === lastSerializedRef.current) return;

    // 既存タイマーキャンセル
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // localStorage に常時 mirror (未サインインでも復元可能)
      try {
        window.localStorage.setItem(draftStorageKey(candidateId), serialized);
      } catch {
        /* ストレージ容量等で失敗しても致命的ではない */
      }
      // サインイン中なら Firestore drafts/{id} にも upsert
      if (user) {
        void saveDraft(getFirebaseDb(), user.uid, candidateId, values).then(
          () => {
            lastSerializedRef.current = serialized;

            setLastSavedAt(new Date());
          },
          () => {
            /* 失敗時は次回再 try、UI は止めない */
          },
        );
      } else {
        lastSerializedRef.current = serialized;

        setLastSavedAt(new Date());
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [candidateId, values, user, enabled]);

  const reset = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lastSerializedRef.current = '';
    setLastSavedAt(null);
    try {
      window.localStorage.removeItem(draftStorageKey(candidateId));
    } catch {
      /* ignore */
    }
  };

  return { lastSavedAt, reset };
}

/** 未サインインユーザ向けの初期値復元 (localStorage) */
export function readLocalDraft(candidateId: string): FeedbackFormValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(candidateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedbackFormValue;
    return parsed;
  } catch {
    return null;
  }
}
