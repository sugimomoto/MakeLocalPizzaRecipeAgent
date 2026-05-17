/**
 * Firebase Web SDK の client-side singleton。
 *
 * - Slice 4: client → Firestore 直接書込み (BFF 経由なし)。
 * - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` の場合、auth/firestore/storage の
 *   3 ハンドルを Emulator に向ける (localhost:9099 / 8080 / 9199)。
 * - HMR / 二重初期化対策で `getApps()` を見て singleton 化、
 *   Emulator 接続済みフラグを auth インスタンス上に持たせて重複 connect を防ぐ。
 *
 * server-side で参照しても crash しないように、Emulator 接続は
 * `typeof window !== 'undefined'` でガード。
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

type EmulatorMarked = { _mlprEmulatorConnected?: true };

function readEnv(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  useEmulator: boolean;
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
    maybeConnectEmulators();
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    maybeConnectEmulators();
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getFirebaseApp());
    maybeConnectEmulators();
  }
  return _storage;
}

function maybeConnectEmulators(): void {
  if (typeof window === 'undefined') return;
  const env = readEnv();
  if (!env.useEmulator) return;
  // 3 ハンドルが全部揃ったタイミングでまとめて connect (どれか 1 つから呼ばれてもよい)
  if (!_auth || !_db || !_storage) return;
  const marker = _auth as Auth & EmulatorMarked;
  if (marker._mlprEmulatorConnected) return;
  connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(_db, 'localhost', 8080);
  connectStorageEmulator(_storage, 'localhost', 9199);
  marker._mlprEmulatorConnected = true;
}

/** test 用: モジュール内 singleton をリセット (本番コードからは呼ばない) */
export function __resetFirebaseSingletonForTests(): void {
  _app = null;
  _auth = null;
  _db = null;
  _storage = null;
}
