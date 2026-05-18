/**
 * Firebase Emulator が必要な Security Rules テスト専用の vitest 設定。
 *
 * 通常の `pnpm test` (vitest.config.ts) は src/** と app/** だけを対象にし
 * Emulator なしでも走る。rules テストは Emulator (Firestore: 8080, Storage:
 * 9199 / devcontainer なら .env で上書き) を相手にするので、独立した config
 * 経由でしか実行しない。
 *
 * 起動例:
 *   firebase emulators:exec --project=mlpr-local "pnpm test:rules"
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rules/**/*.{test,spec}.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    passWithNoTests: false,
    testTimeout: 15000,
  },
});
