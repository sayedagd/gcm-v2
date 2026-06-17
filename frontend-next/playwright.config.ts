import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.SMOKE_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:3000';

const workers = process.env.CI ? 1 : null;

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(workers !== null ? { workers } : {}),
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'html',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
