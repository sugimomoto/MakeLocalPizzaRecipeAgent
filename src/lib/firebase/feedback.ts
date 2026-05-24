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
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
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
} from '@/domain/feedback';

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
  payload: Omit<Feedback, 'cookedAt' | 'updatedAt'> & Partial<Pick<Feedback, 'note' | 'photoUrl'>>,
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
  if (payload.photoUrl !== undefined) out.photoUrl = payload.photoUrl;
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
  if (partial.photoUrl !== undefined) payload.photoUrl = partial.photoUrl;
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

function normalizeDraft(data: DocumentData): FeedbackDraft {
  const updatedAtRaw = data['updatedAt'];
  let updatedAt: Date;
  if (updatedAtRaw && typeof updatedAtRaw === 'object' && 'toDate' in updatedAtRaw) {
    updatedAt = (updatedAtRaw as { toDate: () => Date }).toDate();
  } else if (updatedAtRaw instanceof Date) {
    updatedAt = updatedAtRaw;
  } else {
    updatedAt = new Date();
  }
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
  if (typeof data['photoUrl'] === 'string') draft.photoUrl = data['photoUrl'];
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
