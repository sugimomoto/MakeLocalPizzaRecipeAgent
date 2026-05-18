/**
 * Firebase Web SDK の client-side singleton。
 *
 * - Slice 4: client → Firestore 直接書込み (BFF 経由なし)。
 * - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` の場合、auth/firestore/storage の
 *   3 ハンドルを Emulator に向ける。
 * - 各 Emulator のホストは env で上書き可能 (devcontainer のポートフォワードで
 *   ホスト側ポートがずれる場合に必要):
 *     NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 *     NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
 *     NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
 * - HMR / 二重初期化対策で `getApps()` を見て singleton 化。
 *   Emulator 接続済みフラグを各ハンドルに持たせ、独立に 1 回ずつ connect する
 *   (auth だけ初期化したいケースで storage の connect を待たせない)。
 *
 * server-side で参照しても crash しないように、Emulator 接続は
 * `typeof window !== 'undefined'` でガード。
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

type EmulatorMarked = { _mlprEmulatorConnected?: true };

type EmulatorHostPort = { host: string; port: number };

function parseHostPort(raw: string | undefined, fallback: EmulatorHostPort): EmulatorHostPort {
  if (!raw) return fallback;
  const [host, portStr] = raw.split(':');
  const port = Number.parseInt(portStr ?? '', 10);
  if (!host || !Number.isFinite(port)) return fallback;
  return { host, port };
}

function readEnv(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  useEmulator: boolean;
  authEmulator: EmulatorHostPort;
  firestoreEmulator: EmulatorHostPort;
  storageEmulator: EmulatorHostPort;
} {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '';
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    appId,
    useEmulator,
    authEmulator: parseHostPort(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, {
      host: 'localhost',
      port: 9099,
    }),
    firestoreEmulator: parseHostPort(process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST, {
      host: 'localhost',
      port: 8080,
    }),
    storageEmulator: parseHostPort(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST, {
      host: 'localhost',
      port: 9199,
    }),
  };
}

function initApp(): FirebaseApp {
  const env = readEnv();
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    apiKey: env.apiKey,
    authDomain: env.authDomain,
    projectId: env.projectId,
    storageBucket: env.storageBucket,
    appId: env.appId,
  });
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) _app = initApp();
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    connectAuthEmulatorIfNeeded(_auth);
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    connectFirestoreEmulatorIfNeeded(_db);
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getFirebaseApp());
    connectStorageEmulatorIfNeeded(_storage);
  }
  return _storage;
}

function shouldConnectEmulator(): boolean {
  if (typeof window === 'undefined') return false;
  return readEnv().useEmulator;
}

function connectAuthEmulatorIfNeeded(auth: Auth): void {
  if (!shouldConnectEmulator()) return;
  const marker = auth as Auth & EmulatorMarked;
  if (marker._mlprEmulatorConnected) return;
  const { host, port } = readEnv().authEmulator;
  connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
  marker._mlprEmulatorConnected = true;
}

function connectFirestoreEmulatorIfNeeded(db: Firestore): void {
  if (!shouldConnectEmulator()) return;
  const marker = db as Firestore & EmulatorMarked;
  if (marker._mlprEmulatorConnected) return;
  const { host, port } = readEnv().firestoreEmulator;
  connectFirestoreEmulator(db, host, port);
  marker._mlprEmulatorConnected = true;
}

function connectStorageEmulatorIfNeeded(storage: FirebaseStorage): void {
  if (!shouldConnectEmulator()) return;
  const marker = storage as FirebaseStorage & EmulatorMarked;
  if (marker._mlprEmulatorConnected) return;
  const { host, port } = readEnv().storageEmulator;
  connectStorageEmulator(storage, host, port);
  marker._mlprEmulatorConnected = true;
}

/** test 用: モジュール内 singleton をリセット (本番コードからは呼ばない) */
export function __resetFirebaseSingletonForTests(): void {
  _app = null;
  _auth = null;
  _db = null;
  _storage = null;
}
