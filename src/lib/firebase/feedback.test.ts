import { Timestamp } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteDraft,
  DRAFTS_SUBCOLLECTION,
  SAVED_RECIPES_SUBCOLLECTION,
  saveDraft,
  saveFeedback,
  USERS_COLLECTION,
} from './feedback';

import type { Firestore } from 'firebase/firestore';

// ───── firebase/firestore モック ─────
const docMock = vi.fn<(...args: unknown[]) => unknown>();
const setDocMock = vi.fn<(...args: unknown[]) => Promise<void>>();
const deleteDocMock = vi.fn<(...args: unknown[]) => Promise<void>>();
const onSnapshotMock = vi.fn();
const serverTimestampMock = vi.fn(() => '__SERVER_TIMESTAMP__');

type FirebaseFirestoreModule = typeof import('firebase/firestore');

vi.mock('firebase/firestore', async (orig) => {
  const real = await orig<FirebaseFirestoreModule>();
  return {
    ...real,
    doc: (...a: unknown[]) => docMock(...a),
    setDoc: (...a: unknown[]) => setDocMock(...a),
    deleteDoc: (...a: unknown[]) => deleteDocMock(...a),
    onSnapshot: (...a: unknown[]) => onSnapshotMock(...a),
    serverTimestamp: () => serverTimestampMock(),
  };
});

const db = {} as Firestore;
const uid = 'uid-1';
const cid = 'c_test_001';

beforeEach(() => {
  docMock.mockReset();
  setDocMock.mockReset();
  deleteDocMock.mockReset();
  onSnapshotMock.mockReset();
  serverTimestampMock.mockReturnValue('__SERVER_TIMESTAMP__');
  // doc 呼ばれたら path-mark を返す (text 検証用)
  docMock.mockImplementation((_db, ...segs: unknown[]) => `path:${segs.join('/')}`);
  setDocMock.mockResolvedValue(undefined);
  deleteDocMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveFeedback', () => {
  it('savedRecipes/{id}.feedback に merge save + drafts/{id} 削除', async () => {
    await saveFeedback(db, uid, cid, {
      overallRating: 5,
      axes: { taste: 5, look: 4, story: 5, again: 5 },
      whatWorked: ['見た目'],
      whatToTune: [],
      guestVibe: ['会話が弾んだ'],
      guestCount: 4,
    });

    // setDoc が savedRecipes と drafts の両方に効く前に savedRecipes が呼ばれる
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [refArg, dataArg, optionsArg] = setDocMock.mock.calls[0]!;
    expect(refArg).toBe(`path:${USERS_COLLECTION}/${uid}/${SAVED_RECIPES_SUBCOLLECTION}/${cid}`);
    expect(optionsArg).toEqual({ merge: true });
    const data = dataArg as { feedback: Record<string, unknown> };
    expect(data.feedback.overallRating).toBe(5);
    expect(data.feedback.axes).toEqual({ taste: 5, look: 4, story: 5, again: 5 });
    expect(data.feedback.whatWorked).toEqual(['見た目']);
    expect(data.feedback.guestCount).toBe(4);
    expect(data.feedback.cookedAt).toBe('__SERVER_TIMESTAMP__');
    expect(data.feedback.updatedAt).toBe('__SERVER_TIMESTAMP__');
    // draft 削除
    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(deleteDocMock.mock.calls[0]![0]).toBe(
      `path:${USERS_COLLECTION}/${uid}/${DRAFTS_SUBCOLLECTION}/${cid}`,
    );
  });

  it('isFirst=false で cookedAt を含めない', async () => {
    await saveFeedback(
      db,
      uid,
      cid,
      {
        overallRating: 4,
        axes: { taste: 4, look: 0, story: 0, again: 0 },
        whatWorked: [],
        whatToTune: [],
        guestVibe: [],
        guestCount: null,
      },
      { isFirst: false },
    );
    const data = setDocMock.mock.calls[0]![1] as { feedback: Record<string, unknown> };
    expect(data.feedback.cookedAt).toBeUndefined();
    expect(data.feedback.updatedAt).toBe('__SERVER_TIMESTAMP__');
  });

  it('チップ配列のマスタ外 / 範囲外スコアは正規化される', async () => {
    await saveFeedback(db, uid, cid, {
      overallRating: 99 as unknown as 5, // 範囲外
      axes: { taste: -1 as unknown as 0, look: 5, story: 5, again: 5 },
      whatWorked: ['見た目', '謎の項目'] as string[],
      whatToTune: [],
      guestVibe: [],
      guestCount: 99,
    });
    const data = setDocMock.mock.calls[0]![1] as { feedback: Record<string, unknown> };
    expect(data.feedback.overallRating).toBe(5); // clamp
    expect((data.feedback.axes as Record<string, number>).taste).toBe(0); // clamp
    expect(data.feedback.whatWorked).toEqual(['見た目']); // 「謎の項目」除外
    expect(data.feedback.guestCount).toBe(20); // clamp
  });

  it('draft 削除に失敗しても全体は成功する', async () => {
    deleteDocMock.mockRejectedValueOnce(new Error('not-exists'));
    await expect(
      saveFeedback(db, uid, cid, {
        overallRating: 3,
        axes: { taste: 3, look: 0, story: 0, again: 0 },
        whatWorked: [],
        whatToTune: [],
        guestVibe: [],
        guestCount: null,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('saveDraft', () => {
  it('drafts/{id} に merge save、updatedAt は serverTimestamp', async () => {
    await saveDraft(db, uid, cid, {
      overallRating: 3,
      axes: { taste: 3, look: 2, story: 0, again: 0 },
      whatWorked: ['食材の組合せ'],
    });
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [refArg, dataArg, optionsArg] = setDocMock.mock.calls[0]!;
    expect(refArg).toBe(`path:${USERS_COLLECTION}/${uid}/${DRAFTS_SUBCOLLECTION}/${cid}`);
    expect(optionsArg).toEqual({ merge: true });
    const data = dataArg as Record<string, unknown>;
    expect(data.overallRating).toBe(3);
    expect(data.axes).toEqual({ taste: 3, look: 2, story: 0, again: 0 });
    expect(data.whatWorked).toEqual(['食材の組合せ']);
    expect(data.updatedAt).toBe('__SERVER_TIMESTAMP__');
  });

  it('partial 入力では未指定キーを Firestore に書かない', async () => {
    await saveDraft(db, uid, cid, { overallRating: 2 });
    const data = setDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(data.overallRating).toBe(2);
    expect(data.axes).toBeUndefined();
    expect(data.whatWorked).toBeUndefined();
    expect(data.guestCount).toBeUndefined();
  });
});

describe('deleteDraft', () => {
  it('drafts/{id} を deleteDoc。失敗は無視', async () => {
    deleteDocMock.mockRejectedValueOnce(new Error('not-exists'));
    await expect(deleteDraft(db, uid, cid)).resolves.toBeUndefined();
    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(deleteDocMock.mock.calls[0]![0]).toBe(
      `path:${USERS_COLLECTION}/${uid}/${DRAFTS_SUBCOLLECTION}/${cid}`,
    );
  });
});

// normalizeFeedback は saved-recipe.ts 経由でテストされる (saved-recipe テストに譲る)
// が、Timestamp 変換の最小 sanity をここでも 1 件確認
describe('Timestamp 変換 sanity', () => {
  it('Timestamp は Date になる (Firestore SDK ネイティブ)', () => {
    const t = Timestamp.fromMillis(1700000000000);
    expect(t.toDate().getTime()).toBe(1700000000000);
  });
});
