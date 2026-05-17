/**
 * client.ts は Firebase Web SDK の薄いラッパなので、テストは「環境変数による
 * Emulator 接続有無の分岐」と「複数呼び出しでも 1 度しか connect しない (HMR 対策)」
 * の 2 点に絞る。Firebase 本体の挙動はテストしない (本体 SDK のテストはしない方針)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeAppMock = vi.fn();
const getAppsMock = vi.fn();
const getAuthMock = vi.fn();
const getFirestoreMock = vi.fn();
const getStorageMock = vi.fn();
const connectAuthEmulatorMock = vi.fn();
const connectFirestoreEmulatorMock = vi.fn();
const connectStorageEmulatorMock = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => initializeAppMock(...args),
  getApps: () => getAppsMock(),
}));
vi.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => getAuthMock(...args),
  connectAuthEmulator: (...args: unknown[]) => connectAuthEmulatorMock(...args),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: (...args: unknown[]) => getFirestoreMock(...args),
  connectFirestoreEmulator: (...args: unknown[]) => connectFirestoreEmulatorMock(...args),
}));
vi.mock('firebase/storage', () => ({
  getStorage: (...args: unknown[]) => getStorageMock(...args),
  connectStorageEmulator: (...args: unknown[]) => connectStorageEmulatorMock(...args),
}));

const ORIG_ENV = { ...process.env };

import type * as ClientModuleType from './client';

async function loadClient(): Promise<typeof ClientModuleType> {
  vi.resetModules();
  return import('./client');
}

beforeEach(() => {
  initializeAppMock.mockReset();
  getAppsMock.mockReset();
  getAuthMock.mockReset();
  getFirestoreMock.mockReset();
  getStorageMock.mockReset();
  connectAuthEmulatorMock.mockReset();
  connectFirestoreEmulatorMock.mockReset();
  connectStorageEmulatorMock.mockReset();

  // 各 mock のデフォルト戻り値 (識別可能なシンボル)
  const fakeApp = { __kind: 'app' };
  initializeAppMock.mockReturnValue(fakeApp);
  getAppsMock.mockReturnValue([]);
  // Auth インスタンスにフラグを書き込めるよう、ミュータブルなオブジェクトを返す
  getAuthMock.mockImplementation(() => ({ __kind: 'auth' }));
  getFirestoreMock.mockReturnValue({ __kind: 'firestore' });
  getStorageMock.mockReturnValue({ __kind: 'storage' });
});

afterEach(() => {
  // env を毎回リセット
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIG_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIG_ENV);
});

describe('firebase/client', () => {
  it('initializes the app once across multiple getter calls (singleton)', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mlpr-local';
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'fake';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mlpr-local.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:0:web:0';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'false';

    const mod = await loadClient();
    mod.getFirebaseAuth();
    mod.getFirebaseDb();
    mod.getFirebaseStorage();
    mod.getFirebaseAuth();

    expect(initializeAppMock).toHaveBeenCalledTimes(1);
    expect(initializeAppMock).toHaveBeenCalledWith({
      apiKey: 'fake',
      authDomain: 'mlpr-local.firebaseapp.com',
      projectId: 'mlpr-local',
      storageBucket: 'mlpr-local.appspot.com',
      appId: '1:0:web:0',
    });
  });

  it('reuses an existing FirebaseApp via getApps() (HMR safe)', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mlpr-local';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'false';
    const existing = { __kind: 'pre-existing-app' };
    getAppsMock.mockReturnValue([existing]);

    const mod = await loadClient();
    mod.getFirebaseAuth();

    expect(initializeAppMock).not.toHaveBeenCalled();
    expect(getAuthMock).toHaveBeenCalledWith(existing);
  });

  it('connects all three emulators when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true and all handles are obtained', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mlpr-local';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

    const mod = await loadClient();
    // window は jsdom 環境で既に存在
    mod.getFirebaseAuth();
    mod.getFirebaseDb();
    mod.getFirebaseStorage();

    expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'auth' }),
      'http://localhost:9099',
      { disableWarnings: true },
    );
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'firestore' }),
      'localhost',
      8080,
    );
    expect(connectStorageEmulatorMock).toHaveBeenCalledWith(
      expect.objectContaining({ __kind: 'storage' }),
      'localhost',
      9199,
    );
  });

  it('does not connect emulators when NEXT_PUBLIC_USE_FIREBASE_EMULATOR is not "true"', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mlpr-local';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'false';

    const mod = await loadClient();
    mod.getFirebaseAuth();
    mod.getFirebaseDb();
    mod.getFirebaseStorage();

    expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
    expect(connectFirestoreEmulatorMock).not.toHaveBeenCalled();
    expect(connectStorageEmulatorMock).not.toHaveBeenCalled();
  });

  it('connects emulators only once even if getters are called repeatedly', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mlpr-local';
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

    const mod = await loadClient();
    mod.getFirebaseAuth();
    mod.getFirebaseDb();
    mod.getFirebaseStorage();
    mod.getFirebaseAuth();
    mod.getFirebaseDb();

    expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
    expect(connectStorageEmulatorMock).toHaveBeenCalledTimes(1);
  });
});
