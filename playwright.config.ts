import { defineConfig, devices } from '@playwright/test';

// Use PORT env var (set by npm test scripts) to avoid conflicts when multiple test sessions run in parallel
const port = Number(process.env.PORT) || 3000;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-touch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
      grep: /Touch interactions/,
    },
  ],
  webServer: {
    command: `npx serve -l ${port} -s .`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
