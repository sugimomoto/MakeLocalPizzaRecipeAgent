/**
 * Firestore `users/{uid}/savedRecipes/{candidateId}` の CRUD ヘルパ。
 *
 * - ドキュメント ID = candidateId なので 1 候補は 1 ユーザにつき 1 件しか保存できない
 *   (重複保存防止 + ハートトグルが冪等)。
 * - savedAt は serverTimestamp() を使い、Firestore 側で時刻が決まる。
 * - 読出し時 Firestore Timestamp → JS Date に正規化して `SavedRecipe` 型として返す。
 * - 未認証時の保護は Firestore Security Rules 側で実施 (このヘルパは uid を受け取るだけ)。
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  clampGuestCount,
  clampScore,
  FEEDBACK_AXIS_ORDER,
  normalizeChipList,
  type Feedback,
  type FeedbackAxisKey,
} from '@/domain/feedback';

import type { SavedRecipe, SavedRecipeSnapshot } from '@/domain/saved-recipe';

export const USERS_COLLECTION = 'users';
export const SAVED_RECIPES_SUBCOLLECTION = 'savedRecipes';

function timestampToDate(value: unknown, fallback: Date): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return fallback;
}

function normalizeFeedback(raw: unknown): Feedback | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const axesRaw = (data['axes'] as Record<string, unknown> | undefined) ?? {};
  const axes = Object.fromEntries(
    FEEDBACK_AXIS_ORDER.map((k) => [k, clampScore(axesRaw[k])]),
  ) as Feedback['axes'];
  const now = new Date();
  const updatedAt = timestampToDate(data['updatedAt'], now);
  const cookedAt = timestampToDate(data['cookedAt'], updatedAt);
  const feedback: Feedback = {
    overallRating: clampScore(data['overallRating']) as Feedback['overallRating'],
    axes: axes as Record<FeedbackAxisKey, Feedback['axes'][FeedbackAxisKey]>,
    whatWorked: normalizeChipList('whatWorked', data['whatWorked']),
    whatToTune: normalizeChipList('whatToTune', data['whatToTune']),
    guestVibe: normalizeChipList('guestVibe', data['guestVibe']),
    guestCount: clampGuestCount(data['guestCount']),
    cookedAt,
    updatedAt,
  };
  if (typeof data['note'] === 'string') feedback.note = data['note'];
  if (typeof data['photoUrl'] === 'string') feedback.photoUrl = data['photoUrl'];
  return feedback;
}

function savedRecipeDocRef(db: Firestore, uid: string, candidateId: string) {
  return doc(db, USERS_COLLECTION, uid, SAVED_RECIPES_SUBCOLLECTION, candidateId);
}

function savedRecipesCollectionRef(db: Firestore, uid: string) {
  return collection(db, USERS_COLLECTION, uid, SAVED_RECIPES_SUBCOLLECTION);
}

/**
 * Firestore の生 data を SavedRecipe (savedAt が Date) に正規化する。
 * - savedAt が未着 (serverTimestamp() 反映前) なら呼び出し時刻で代用
 * - 未知フィールドは無視する (forward compat 寄せ)
 */
function normalizeSavedRecipe(data: DocumentData): SavedRecipe {
  const savedAtRaw = data['savedAt'];
  let savedAt: Date;
  if (savedAtRaw instanceof Timestamp) savedAt = savedAtRaw.toDate();
  else if (savedAtRaw instanceof Date) savedAt = savedAtRaw;
  else savedAt = new Date();

  const base: SavedRecipe = {
    candidateId: String(data['candidateId'] ?? ''),
    title: String(data['title'] ?? ''),
    localeId: String(data['localeId'] ?? '') as SavedRecipe['localeId'],
    prefecture: String(data['prefecture'] ?? ''),
    strategy: String(data['strategy'] ?? 'exploit') as SavedRecipe['strategy'],
    imageUrl: String(data['imageUrl'] ?? ''),
    savedAt,
  };
  if (Array.isArray(data['ingredients'])) {
    base.ingredients = data['ingredients'] as NonNullable<SavedRecipe['ingredients']>;
  }
  // Slice 6: candidate / recipe detail スナップショット (optional)
  if (typeof data['concept'] === 'string') base.concept = data['concept'];
  if (Array.isArray(data['keyIngredients'])) {
    base.keyIngredients = data['keyIngredients'] as string[];
  }
  if (Array.isArray(data['sceneTags'])) {
    base.sceneTags = data['sceneTags'] as string[];
  }
  if (typeof data['why'] === 'string') base.why = data['why'];
  if (data['meta'] && typeof data['meta'] === 'object') {
    base.meta = data['meta'] as NonNullable<SavedRecipe['meta']>;
  }
  if (Array.isArray(data['materials'])) {
    base.materials = data['materials'] as NonNullable<SavedRecipe['materials']>;
  }
  if (Array.isArray(data['steps'])) {
    base.steps = data['steps'] as NonNullable<SavedRecipe['steps']>;
  }
  if (data['story'] && typeof data['story'] === 'object') {
    base.story = data['story'] as NonNullable<SavedRecipe['story']>;
  }
  // Slice 7: feedback
  const fb = normalizeFeedback(data['feedback']);
  if (fb) base.feedback = fb;
  return base;
}

export async function saveRecipe(
  db: Firestore,
  uid: string,
  snapshot: SavedRecipeSnapshot,
): Promise<void> {
  const ref = savedRecipeDocRef(db, uid, snapshot.candidateId);
  await setDoc(ref, {
    ...snapshot,
    savedAt: serverTimestamp(),
  });
}

export async function unsaveRecipe(db: Firestore, uid: string, candidateId: string): Promise<void> {
  await deleteDoc(savedRecipeDocRef(db, uid, candidateId));
}

export function subscribeSavedRecipe(
  db: Firestore,
  uid: string,
  candidateId: string,
  onChange: (recipe: SavedRecipe | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = savedRecipeDocRef(db, uid, candidateId);
  return onSnapshot(
    ref,
    (snap: DocumentSnapshot<DocumentData>) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(normalizeSavedRecipe(snap.data()));
    },
    (error) => onError?.(error),
  );
}

export function subscribeSavedRecipes(
  db: Firestore,
  uid: string,
  onChange: (recipes: SavedRecipe[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(savedRecipesCollectionRef(db, uid), orderBy('savedAt', 'desc'));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const items = snap.docs.map((d) => normalizeSavedRecipe(d.data()));
      onChange(items);
    },
    (error) => onError?.(error),
  );
}
