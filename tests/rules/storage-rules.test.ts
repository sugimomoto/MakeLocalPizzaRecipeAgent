/**
 * Storage Security Rules ユニットテスト。
 *
 * `storage.rules` の挙動:
 *  - recipes/{candidateId} は read=public / write=client deny (Python Agent のみ書込)
 *  - その他のパスは全 deny
 */
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const PROJECT_ID = 'mlpr-rules-test';

function parseHostPort(raw: string | undefined, fallbackPort: number) {
  const host = raw?.split(':')[0] || 'localhost';
  const port = Number.parseInt(raw?.split(':')[1] ?? '', 10);
  return { host, port: Number.isFinite(port) ? port : fallbackPort };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const storage = parseHostPort(process.env['NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST'], 9199);
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: storage.host,
      port: storage.port,
      rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8'),
    },
  });
});

afterEach(async () => {
  if (testEnv) await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('storage.rules — recipes/{candidateId}', () => {
  it('anyone (unauth) can read existing recipe images', async () => {
    // seed via admin path
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminRef = ref(ctx.storage(), 'recipes/cand-1.png');
      await uploadString(adminRef, 'fakepng', 'raw');
    });

    const guest = testEnv.unauthenticatedContext();
    await assertSucceeds(getDownloadURL(ref(guest.storage(), 'recipes/cand-1.png')));
  });

  it('unauth client cannot write into recipes/', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(uploadString(ref(guest.storage(), 'recipes/cand-1.png'), 'fakepng', 'raw'));
  });

  it('authenticated client also cannot write (write is server-only)', async () => {
    const user = testEnv.authenticatedContext('user-a');
    await assertFails(uploadString(ref(user.storage(), 'recipes/cand-2.png'), 'fakepng', 'raw'));
  });

  it('unauth client cannot read unrelated paths', async () => {
    const guest = testEnv.unauthenticatedContext();
    await assertFails(getDownloadURL(ref(guest.storage(), 'private/secret.txt')));
  });
});
