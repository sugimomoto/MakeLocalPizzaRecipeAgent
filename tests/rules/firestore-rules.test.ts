/**
 * Firestore Security Rules ユニットテスト。
 *
 * `firestore.rules` の users/{uid}/savedRecipes/{candidateId} ルール:
 *  - 本人 (request.auth.uid === uid) は R/W 可
 *  - 他人 (uid mismatch) は R/W 不可
 *  - 未認証は R/W 不可
 *  - その他のパス (users/{uid}/sessions/... 等) は全 deny
 *
 * @firebase/rules-unit-testing を使い Firestore Emulator (.env でホスト変更可)
 * を相手に実発火させて検証する。
 *
 * 実行前提:
 *   - Firebase Emulator が走っていること (firebase emulators:start)
 *   - .env で NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8081 など
 *     のフォワード後ポートが設定されている場合、ここでも同じ値を読む
 */
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const PROJECT_ID = 'mlpr-rules-test';

function parseHostPort(raw: string | undefined, fallbackPort: number) {
  const host = raw?.split(':')[0] || 'localhost';
  const port = Number.parseInt(raw?.split(':')[1] ?? '', 10);
  return { host, port: Number.isFinite(port) ? port : fallbackPort };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const firestore = parseHostPort(
    process.env['NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST'],
    8080,
  );
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: firestore.host,
      port: firestore.port,
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

afterEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const SAVED_PATH = (uid: string, candidateId: string) => `users/${uid}/savedRecipes/${candidateId}`;

const SAMPLE_PAYLOAD = {
  candidateId: 'cand-1',
  title: 'test',
  localeId: 'miyagi',
  prefecture: '宮城県',
  strategy: 'exploit',
  imageUrl: '',
  savedAt: new Date(),
};

describe('firestore.rules — users/{uid}/savedRecipes/{candidateId}', () => {
  it('owner can read their own saved recipe', async () => {
    const ownerUid = 'user-a';
    // seed: 自分の doc を Admin (rules bypass) で書いておく
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), SAVED_PATH(ownerUid, 'cand-1')), SAMPLE_PAYLOAD);
    });
    const owner = testEnv.authenticatedContext(ownerUid);
    await assertSucceeds(getDoc(doc(owner.firestore(), SAVED_PATH(ownerUid, 'cand-1'))));
  });

  it('owner can write their own saved recipe', async () => {
    const ownerUid = 'user-a';
    const owner = testEnv.authenticatedContext(ownerUid);
    await assertSucceeds(
      setDoc(doc(owner.firestore(), SAVED_PATH(ownerUid, 'cand-1')), SAMPLE_PAYLOAD),
    );
  });

  it('owner can delete their own saved recipe', async () => {
    const ownerUid = 'user-a';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), SAVED_PATH(ownerUid, 'cand-1')), SAMPLE_PAYLOAD);
    });
    const owner = testEnv.authenticatedContext(ownerUid);
    await assertSucceeds(deleteDoc(doc(owner.firestore(), SAVED_PATH(ownerUid, 'cand-1'))));
  });

  it("other user cannot read someone else's saved recipe", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), SAVED_PATH('user-a', 'cand-1')), SAMPLE_PAYLOAD);
    });
    const intruder = testEnv.authenticatedContext('user-b');
    await assertFails(getDoc(doc(intruder.firestore(), SAVED_PATH('user-a', 'cand-1'))));
  });

  it("other user cannot write into someone else's saved recipe", async () => {
    const intruder = testEnv.authenticatedContext('user-b');
    await assertFails(
      setDoc(doc(intruder.firestore(), SAVED_PATH('user-a', 'cand-2')), SAMPLE_PAYLOAD),
    );
  });

  it('unauthenticated client cannot read', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(guest.firestore(), SAVED_PATH('user-a', 'cand-1'))));
  });

  it('unauthenticated client cannot write', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(guest.firestore(), SAVED_PATH('user-a', 'cand-1')), SAMPLE_PAYLOAD),
    );
  });

  it('owner cannot reach unrelated collections (sessions/...) — explicit deny', async () => {
    const owner = testEnv.authenticatedContext('user-a');
    await assertFails(
      setDoc(doc(owner.firestore(), 'users/user-a/sessions/sess-1'), { hello: 'world' }),
    );
  });
});

// Slice 7 追加: フィードバック下書き subcollection
describe('firestore.rules — users/{uid}/drafts/{candidateId} (Slice 7)', () => {
  const DRAFT_PATH = (uid: string, candidateId: string) => `users/${uid}/drafts/${candidateId}`;

  const SAMPLE_DRAFT = {
    overallRating: 4,
    axes: { taste: 4, look: 4, story: 0, again: 0 },
    whatWorked: ['見た目'],
    updatedAt: new Date(),
  };

  it('owner can write their own draft', async () => {
    const owner = testEnv.authenticatedContext('user-a');
    await assertSucceeds(
      setDoc(doc(owner.firestore(), DRAFT_PATH('user-a', 'cand-1')), SAMPLE_DRAFT),
    );
  });

  it('owner can read their own draft', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), DRAFT_PATH('user-a', 'cand-1')), SAMPLE_DRAFT);
    });
    const owner = testEnv.authenticatedContext('user-a');
    await assertSucceeds(getDoc(doc(owner.firestore(), DRAFT_PATH('user-a', 'cand-1'))));
  });

  it('owner can delete their own draft (submit 成功時に呼ばれる)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), DRAFT_PATH('user-a', 'cand-1')), SAMPLE_DRAFT);
    });
    const owner = testEnv.authenticatedContext('user-a');
    await assertSucceeds(deleteDoc(doc(owner.firestore(), DRAFT_PATH('user-a', 'cand-1'))));
  });

  it("other user cannot read someone else's draft", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), DRAFT_PATH('user-a', 'cand-1')), SAMPLE_DRAFT);
    });
    const intruder = testEnv.authenticatedContext('user-b');
    await assertFails(getDoc(doc(intruder.firestore(), DRAFT_PATH('user-a', 'cand-1'))));
  });

  it("other user cannot write into someone else's draft", async () => {
    const intruder = testEnv.authenticatedContext('user-b');
    await assertFails(
      setDoc(doc(intruder.firestore(), DRAFT_PATH('user-a', 'cand-2')), SAMPLE_DRAFT),
    );
  });

  it('unauthenticated client cannot read draft', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(guest.firestore(), DRAFT_PATH('user-a', 'cand-1'))));
  });

  it('unauthenticated client cannot write draft', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(guest.firestore(), DRAFT_PATH('user-a', 'cand-1')), SAMPLE_DRAFT));
  });
});

describe('firestore.rules — furusato_items/{ingredientId} (Slice 5)', () => {
  const FURUSATO_PATH = (ingredientId: string) => `furusato_items/${ingredientId}`;
  const SAMPLE_FURUSATO_DOC = {
    ingredientId: 'miyagi-oyster',
    items: [
      {
        itemId: 'shop-A:item-1',
        ingredientId: 'miyagi-oyster',
        platform: 'rakuten',
        title: '【ふるさと納税】宮城県松島町 三陸産生牡蠣 1kg',
        municipality: '宮城県松島町',
        producer: '松島漁業',
        donationAmount: 12000,
        url: 'https://item.rakuten.co.jp/shop/abc/',
        affiliateUrl: null,
        imageUrl: null,
        inStock: true,
        fetchedAt: '2026-05-19T00:00:00.000Z',
      },
    ],
    refreshedAt: new Date('2026-05-19T00:00:00Z'),
    ttlExpiresAt: new Date('2026-05-26T00:00:00Z'),
  };

  it('unauthenticated client can read furusato_items (public read)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), FURUSATO_PATH('miyagi-oyster')), SAMPLE_FURUSATO_DOC);
    });
    const guest = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(guest.firestore(), FURUSATO_PATH('miyagi-oyster'))));
  });

  it('authenticated client can also read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), FURUSATO_PATH('miyagi-oyster')), SAMPLE_FURUSATO_DOC);
    });
    const user = testEnv.authenticatedContext('user-a');
    await assertSucceeds(getDoc(doc(user.firestore(), FURUSATO_PATH('miyagi-oyster'))));
  });

  it('unauthenticated client cannot write into furusato_items', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(guest.firestore(), FURUSATO_PATH('miyagi-oyster')), SAMPLE_FURUSATO_DOC),
    );
  });

  it('authenticated client also cannot write (only refresh script via Admin SDK)', async () => {
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(
      setDoc(doc(user.firestore(), FURUSATO_PATH('miyagi-oyster')), SAMPLE_FURUSATO_DOC),
    );
  });

  it('authenticated client cannot delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), FURUSATO_PATH('miyagi-oyster')), SAMPLE_FURUSATO_DOC);
    });
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(deleteDoc(doc(user.firestore(), FURUSATO_PATH('miyagi-oyster'))));
  });
});

// Slice 9 追加: アプリ層レートリミット (Admin SDK のみ書き込み可能・client は全 deny)
describe('firestore.rules — rate_limits/{docId} (Slice 9)', () => {
  const RL_PATH = (docId: string) => `rate_limits/${docId}`;

  const SAMPLE_RATE_LIMIT_DOC = {
    count: 3,
    limit: 5,
    routeKey: '/api/recipes/[candidateId]',
    bucket: '2026053015',
    keyKind: 'guest',
    keyValue: 'abc123',
    createdAt: new Date('2026-05-30T15:00:00Z'),
    updatedAt: new Date('2026-05-30T15:30:00Z'),
    expiresAt: new Date('2026-05-30T17:00:00Z'),
  };

  it('unauthenticated client cannot read rate_limits', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), RL_PATH('test-doc')), SAMPLE_RATE_LIMIT_DOC);
    });
    const guest = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(guest.firestore(), RL_PATH('test-doc'))));
  });

  it('unauthenticated client cannot write rate_limits', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(guest.firestore(), RL_PATH('test-doc')), SAMPLE_RATE_LIMIT_DOC));
  });

  it('authenticated client cannot read rate_limits (admin-only)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), RL_PATH('test-doc')), SAMPLE_RATE_LIMIT_DOC);
    });
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(getDoc(doc(user.firestore(), RL_PATH('test-doc'))));
  });

  it('authenticated client cannot write rate_limits (admin-only)', async () => {
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(setDoc(doc(user.firestore(), RL_PATH('test-doc')), SAMPLE_RATE_LIMIT_DOC));
  });

  it('authenticated client cannot delete rate_limits', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), RL_PATH('test-doc')), SAMPLE_RATE_LIMIT_DOC);
    });
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(deleteDoc(doc(user.firestore(), RL_PATH('test-doc'))));
  });
});
