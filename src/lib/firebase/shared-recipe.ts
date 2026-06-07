/**
 * Firestore `shared_recipes/{shareId}` の server-side ヘルパ (Slice 10)
 *
 * - 書き込みは Admin SDK のみ (Firestore Rules で client 直書きは deny)。
 * - 公開閲覧ページ (`/share/[shareId]`) は本ヘルパ経由で読み出す。
 * - べき等性インデックス `share_index/{indexKey}` も同 transaction で確保する。
 *
 * 呼び出し元:
 * - `app/api/share/route.ts` (POST)
 * - `app/share/[shareId]/page.tsx` (Server Component の fetch)
 */
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { buildShareIndexKey, type ShareRequest, type SharedRecipeSnapshot } from '@/domain/share';

export const SHARED_RECIPES_COLLECTION = 'shared_recipes';
export const SHARE_INDEX_COLLECTION = 'share_index';

type Owner = { kind: 'auth'; uid: string } | { kind: 'guest'; guestSessionId: string };

/** Owner を indexKey の組み立てに渡すためのパッキング。 */
function ownerToIndexKey(owner: Owner, candidateId: string): string {
  if (owner.kind === 'auth') {
    return buildShareIndexKey('auth', owner.uid, candidateId);
  }
  return buildShareIndexKey('guest', owner.guestSessionId, candidateId);
}

/**
 * shareId を新規作成 (べき等)。
 * - 既に `(owner, candidateId)` で発行済なら既存 shareId を返す (`isNew: false`)。
 * - そうでなければ randomUUID で shareId を作って doc + index doc を一括書き込み。
 */
export async function createSharedRecipe(
  adminDb: Firestore,
  args: {
    owner: Owner;
    payload: ShareRequest;
  },
): Promise<{ shareId: string; isNew: boolean }> {
  const indexKey = ownerToIndexKey(args.owner, args.payload.candidateId);
  const indexRef = adminDb.collection(SHARE_INDEX_COLLECTION).doc(indexKey);

  return adminDb.runTransaction(async (tx) => {
    const indexSnap = await tx.get(indexRef);
    if (indexSnap.exists) {
      const existing = indexSnap.data() as { shareId?: string } | undefined;
      if (existing?.shareId) {
        return { shareId: existing.shareId, isNew: false };
      }
    }
    const shareId = crypto.randomUUID();
    const sharedRef = adminDb.collection(SHARED_RECIPES_COLLECTION).doc(shareId);
    const ownerUid = args.owner.kind === 'auth' ? args.owner.uid : null;
    const ownerGuestSessionId = args.owner.kind === 'guest' ? args.owner.guestSessionId : null;

    tx.set(sharedRef, {
      shareId,
      ownerUid,
      ownerGuestSessionId,
      candidateId: args.payload.candidateId,
      title: args.payload.title,
      concept: args.payload.concept,
      story: args.payload.story,
      meta: args.payload.meta,
      materials: args.payload.materials,
      steps: args.payload.steps,
      imageUrl: args.payload.imageUrl,
      prefecture: args.payload.prefecture,
      strategy: args.payload.strategy,
      localeId: args.payload.localeId,
      sharedAt: FieldValue.serverTimestamp(),
    });
    tx.set(indexRef, { shareId });
    return { shareId, isNew: true };
  });
}

/** shareId から snapshot を取得 (公開ページ用)。存在しなければ null。 */
export async function getSharedRecipe(
  adminDb: Firestore,
  shareId: string,
): Promise<SharedRecipeSnapshot | null> {
  const snap = await adminDb.collection(SHARED_RECIPES_COLLECTION).doc(shareId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;

  const sharedAtRaw = data['sharedAt'];
  const sharedAt =
    sharedAtRaw instanceof Timestamp
      ? sharedAtRaw.toDate()
      : sharedAtRaw instanceof Date
        ? sharedAtRaw
        : new Date();

  return {
    shareId,
    ownerUid: typeof data['ownerUid'] === 'string' ? data['ownerUid'] : null,
    ownerGuestSessionId:
      typeof data['ownerGuestSessionId'] === 'string' ? data['ownerGuestSessionId'] : null,
    candidateId: String(data['candidateId'] ?? ''),
    title: String(data['title'] ?? ''),
    concept: String(data['concept'] ?? ''),
    story: {
      headline: String(data['story']?.headline ?? ''),
      body: String(data['story']?.body ?? ''),
    },
    meta: {
      servings: String(data['meta']?.servings ?? ''),
      difficulty: String(data['meta']?.difficulty ?? ''),
      time: String(data['meta']?.time ?? ''),
    },
    materials: Array.isArray(data['materials'])
      ? (data['materials'] as Array<{ name?: unknown; amount?: unknown }>).map((m) => ({
          name: String(m?.name ?? ''),
          amount: String(m?.amount ?? ''),
        }))
      : [],
    steps: Array.isArray(data['steps'])
      ? (data['steps'] as unknown[]).map((s) => String(s ?? ''))
      : [],
    imageUrl: String(data['imageUrl'] ?? ''),
    prefecture: String(data['prefecture'] ?? ''),
    strategy: (['exploit', 'tune', 'explore'] as const).includes(
      data['strategy'] as 'exploit' | 'tune' | 'explore',
    )
      ? (data['strategy'] as 'exploit' | 'tune' | 'explore')
      : 'exploit',
    localeId: String(data['localeId'] ?? ''),
    sharedAt,
  };
}
