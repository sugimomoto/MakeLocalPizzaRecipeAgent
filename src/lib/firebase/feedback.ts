/**
 * Firestore feedback layer (Slice 7)
 *
 * - **submit (saveFeedback)**: users/{uid}/savedRecipes/{candidateId}.feedback に merge save
 *   同時に drafts/{candidateId} を削除
 * - **draft (saveDraft / subscribeDraft)**: users/{uid}/drafts/{candidateId} に partial を upsert
 * - **subscribeSavedFeedback**: savedRecipes/{id}.feedback を購読 (saved-recipe.ts の subscribe と並列でも可)
 */

import {
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  clampGuestCount,
  clampScore,
  FEEDBACK_AXIS_ORDER,
  normalizeChipList,
  normalizePhotoUrls,
} from '@/domain/feedback';

import { timestampToDate } from './normalize';

import type {
  Feedback,
  FeedbackAxisKey,
  FeedbackChipGroup,
  FeedbackDraft,
} from '@/domain/feedback';

export const USERS_COLLECTION = 'users';
export const SAVED_RECIPES_SUBCOLLECTION = 'savedRecipes';
export const DRAFTS_SUBCOLLECTION = 'drafts';

function savedDocRef(db: Firestore, uid: string, candidateId: string) {
  return doc(db, USERS_COLLECTION, uid, SAVED_RECIPES_SUBCOLLECTION, candidateId);
}

function draftDocRef(db: Firestore, uid: string, candidateId: string) {
  return doc(db, USERS_COLLECTION, uid, DRAFTS_SUBCOLLECTION, candidateId);
}

/** Firestore 書き込み用に余計なフィールドを落とす */
function sanitizeFeedbackPayload(
  payload: Omit<Feedback, 'cookedAt' | 'updatedAt'> & Partial<Pick<Feedback, 'note' | 'photoUrls'>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    overallRating: clampScore(payload.overallRating),
    axes: Object.fromEntries(
      FEEDBACK_AXIS_ORDER.map((k) => [k, clampScore(payload.axes?.[k] ?? 0)]),
    ),
    whatWorked: normalizeChipList('whatWorked', payload.whatWorked ?? []),
    whatToTune: normalizeChipList('whatToTune', payload.whatToTune ?? []),
    guestVibe: normalizeChipList('guestVibe', payload.guestVibe ?? []),
    guestCount: clampGuestCount(payload.guestCount),
  };
  if (payload.note !== undefined) out.note = payload.note;
  // photoUrls は配列で write。空配列のときは Firestore に書かない (= 既存削除は別経路想定だが
  // ここでは write しない方が draft 上でも安全)。
  if (payload.photoUrls !== undefined) {
    out.photoUrls = (payload.photoUrls ?? []).slice(0, 4);
  }
  return out;
}

/**
 * submit: savedRecipes/{id}.feedback に merge save + drafts/{id} を削除。
 * - 初回のみ cookedAt に serverTimestamp、毎回 updatedAt 更新
 * - 既存 cookedAt があれば保持 (merge: true の挙動)
 */
export async function saveFeedback(
  db: Firestore,
  uid: string,
  candidateId: string,
  payload: Omit<Feedback, 'cookedAt' | 'updatedAt'>,
  options?: { isFirst?: boolean },
): Promise<void> {
  const now = serverTimestamp();
  const isFirst = options?.isFirst ?? true;
  const feedback: Record<string, unknown> = sanitizeFeedbackPayload(payload);
  feedback.updatedAt = now;
  if (isFirst) feedback.cookedAt = now;
  await setDoc(savedDocRef(db, uid, candidateId), { feedback }, { merge: true });
  try {
    await deleteDoc(draftDocRef(db, uid, candidateId));
  } catch {
    /* draft 不在は無視 */
  }
}

/** draft: 3 秒 debounce で saveDraft (前回値と差分なしならスキップは hook 側) */
export async function saveDraft(
  db: Firestore,
  uid: string,
  candidateId: string,
  partial: Partial<Omit<Feedback, 'cookedAt' | 'updatedAt'>>,
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (partial.overallRating !== undefined) {
    payload.overallRating = clampScore(partial.overallRating);
  }
  if (partial.axes) {
    payload.axes = Object.fromEntries(
      FEEDBACK_AXIS_ORDER.map((k) => [k, clampScore(partial.axes?.[k] ?? 0)]),
    );
  }
  for (const group of ['whatWorked', 'whatToTune', 'guestVibe'] as const) {
    if (partial[group]) {
      payload[group] = normalizeChipList(group, partial[group]);
    }
  }
  if (partial.guestCount !== undefined) {
    payload.guestCount = clampGuestCount(partial.guestCount);
  }
  if (partial.note !== undefined) payload.note = partial.note;
  if (partial.photoUrls !== undefined) {
    payload.photoUrls = (partial.photoUrls ?? []).slice(0, 4);
  }
  await setDoc(draftDocRef(db, uid, candidateId), payload, { merge: true });
}

/** draft 削除 (submit 成功 / ユーザー discard) */
export async function deleteDraft(db: Firestore, uid: string, candidateId: string): Promise<void> {
  try {
    await deleteDoc(draftDocRef(db, uid, candidateId));
  } catch {
    /* 不在は無視 */
  }
}

/**
 * フィードバックだけ削除 — SavedRecipe 自体は保存帳に残す。
 *
 * Slice 7 後追加: 振り返り帳の「記録を取り消す」用。同時に drafts/{id} も削除。
 * savedRecipes/{id}.feedback フィールド単体を deleteField() で消すため
 * 親 doc は残る (= /library での保存表示は維持される)。
 */
export async function deleteFeedback(
  db: Firestore,
  uid: string,
  candidateId: string,
): Promise<void> {
  await updateDoc(savedDocRef(db, uid, candidateId), { feedback: deleteField() });
  try {
    await deleteDoc(draftDocRef(db, uid, candidateId));
  } catch {
    /* 不在は無視 */
  }
}

function normalizeDraft(data: DocumentData): FeedbackDraft {
  const updatedAt = timestampToDate(data['updatedAt'], new Date());
  const draft: FeedbackDraft = { updatedAt };
  if (data['overallRating'] !== undefined) {
    draft.overallRating = clampScore(data['overallRating']);
  }
  if (data['axes'] && typeof data['axes'] === 'object') {
    const axesRaw = data['axes'] as Record<string, unknown>;
    draft.axes = Object.fromEntries(
      FEEDBACK_AXIS_ORDER.map((k) => [k, clampScore(axesRaw[k])]),
    ) as Feedback['axes'];
  }
  for (const group of ['whatWorked', 'whatToTune', 'guestVibe'] as const) {
    if (Array.isArray(data[group])) {
      draft[group] = normalizeChipList(group as FeedbackChipGroup, data[group]);
    }
  }
  if (data['guestCount'] !== undefined) {
    draft.guestCount = clampGuestCount(data['guestCount']);
  }
  if (typeof data['note'] === 'string') draft.note = data['note'];
  // photoUrls (新) > photoUrl (旧) の優先順で 1 つに正規化
  const photoUrls = normalizePhotoUrls(data['photoUrls'], data['photoUrl']);
  if (photoUrls !== undefined) draft.photoUrls = photoUrls;
  return draft;
}

export function subscribeDraft(
  db: Firestore,
  uid: string,
  candidateId: string,
  onChange: (draft: FeedbackDraft | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = draftDocRef(db, uid, candidateId);
  return onSnapshot(
    ref,
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(normalizeDraft(snap.data()));
    },
    (error) => onError?.(error),
  );
}

// 型安全な再 export
export type { Feedback, FeedbackDraft, FeedbackAxisKey };
