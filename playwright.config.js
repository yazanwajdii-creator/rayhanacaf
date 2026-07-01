// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config — يختبر index.html محلياً (file://) أو عبر static server.
 * يشغّل Chromium (WebKit-compatible) + متصفحات أخرى عند الحاجة.
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false, // localStorage-based → sequential لتجنّب التداخل
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ar-JO',
    timezoneId: 'Asia/Amman',
  },
  webServer: {
    command: 'python3 -m http.server 8080 -d .',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 870 } },
    },
  ],
});
