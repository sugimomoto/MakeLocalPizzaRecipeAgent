import { defineConfig, devices } from '@playwright/test';

import type { ReporterDescription } from '@playwright/test';

/**
 * Playwright 設定。
 *
 * - 既定では `pnpm start` (production build) を webServer として起動する。
 *   dev (--webpack の 12MB バンドル) は VS Code ポートフォワード越しで Safari
 *   が壊れる事例があり、本番に近い構成で検査する方が回帰検知に有用。
 * - `E2E_BASE_URL` を指定した場合は webServer を起動せず外部 URL を叩く
 *   (ローカル iteration: `AGENT_MODE=mock pnpm dev` を別ターミナルで立てて
 *    `E2E_BASE_URL=http://localhost:3000 pnpm test:e2e` の方が速い)。
 * - Agent は `AGENT_MODE=mock` 固定 (Python agent / Vertex 不要、決定論的)。
 * - chromium のみ (CI 高速化目的)。Safari/WebKit 固有の症状は別途手動確認。
 */

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const baseConfig = {
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
          // mock agent で決定論的に動かす。build + start で 12MB dev バンドル問題を回避。
          command: 'pnpm build && AGENT_MODE=mock pnpm start',
          port: PORT,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: { AGENT_MODE: 'mock' },
        },
      },
);
