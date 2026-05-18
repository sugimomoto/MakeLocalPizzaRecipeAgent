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
