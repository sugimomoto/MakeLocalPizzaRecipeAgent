/**
 * Firebase Admin SDK — server-side Firestore へのアクセス経路 (Slice 9)
 *
 * - Cloud Run / 本番: SA に attach された credentials (ADC) で自動初期化
 * - ローカル dev / Vitest: ADC が無いので throw → 呼び出し側 (store selector) で
 *   Memory store にフォールバック
 * - app 二重初期化を避けるためモジュールスコープで Singleton 化
 *
 * NOTE: `firebase-admin` は @grpc/grpc-js 等の Node 専用モジュールに依存するため
 * Next.js 16 webpack dev mode のバンドル対象に含まれないよう、
 * `next.config.ts` の `serverExternalPackages` で除外する。
 */

import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let _app: App | null = null;
let _db: Firestore | null = null;

/**
 * Admin App を取得 (初回のみ初期化)。
 * ADC が無い環境 (ローカルで GOOGLE_APPLICATION_CREDENTIALS / metadata server なし) では
 * initializeApp() は同期的には成功するが、実際の Firestore 操作で throw する。
 * 本関数は initialize 失敗を **同期的に** 検出できないため、呼び出し側の
 * try/catch でハンドリングする想定。
 */
function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0] as App;
    return _app;
  }
  // ADC (Cloud Run の attached SA) を使用。credentials は明示しない。
  _app = initializeApp();
  return _app;
}

/**
 * Admin Firestore client を取得 (initialize は lazy)。
 *
 * 呼び出し側の規約:
 * - Server Component / Route Handler / middleware からのみ呼ぶ (client では使わない)
 * - ADC が無い環境では Firestore 操作が throw する。store selector で
 *   try/catch → Memory store にフォールバックする
 */
export function getAdminFirestore(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}

/**
 * テスト用: 内部状態をリセット (vi.resetModules() と組み合わせて使う)。
 * 本番コードからは呼ばないこと。
 */
export function _resetAdminForTesting(): void {
  _app = null;
  _db = null;
}
