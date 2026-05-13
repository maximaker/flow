// Playwright config — runs the built bundle via `vite preview`.
// Chromium-only by default to keep CI lean; uncomment the other projects
// when cross-browser coverage is needed.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Start `vite preview` before the tests and tear it down after.
  // `dist/` must exist — run `npm run build` first (CI does this in an
  // earlier step). Locally, the webServer.command builds + previews.
  webServer: {
    command: process.env.CI
      ? 'npm run preview -- --port 4173'
      : 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // E2E uses a placeholder PB URL — tests focus on UI/UX, not backend.
      VITE_PB_URL: process.env.VITE_PB_URL || 'http://127.0.0.1:8090',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment when cross-browser coverage is required:
    // { name: 'firefox',  use: { ...devices['Desktop Firefox']  } },
    // { name: 'webkit',   use: { ...devices['Desktop Safari']   } },
  ],
})
