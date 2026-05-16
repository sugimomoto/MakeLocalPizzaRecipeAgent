import { defineConfig, devices } from '@playwright/test';

import type { ReporterDescription } from '@playwright/test';

/**
 * Playwright 設定 (Slice 1 雛形)。
 *
 * - Slice 1 では実走しない (CI からも除外)。Slice 2+ で smoke spec を追加して通す
 * - dev server は package.json の `pnpm dev` 前提
 * - chromium のみ (CI 高速化目的)
 */

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const baseConfig = {
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? ([['github'], ['html', { open: 'never' }]] satisfies ReporterDescription[])
    : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry' as const,
    screenshot: 'only-on-failure' as const,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

export default defineConfig(
  process.env.E2E_BASE_URL
    ? baseConfig
    : {
        ...baseConfig,
        webServer: {
          command: 'pnpm dev',
          port: PORT,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      },
);
