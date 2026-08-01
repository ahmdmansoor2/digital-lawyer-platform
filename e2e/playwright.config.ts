/**
 * Playwright Configuration — منصة المحامي الرقمية
 *
 * E2E tests تستهدف الـ Vite dev server (Express) على port 3000.
 * الـ license gate مُعطّل في dev mode (`!isElectron` = `licenseChecked = true`).
 * الـ auth يطلب login بحساب admin/admin123.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // global timeout per test
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false, // run serially because all tests share the same IndexedDB / localStorage
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Force a fixed viewport so RTL UI is stable across test runs
        viewport: { width: 1440, height: 900 },
        locale: 'ar-EG',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
