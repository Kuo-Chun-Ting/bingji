import { defineConfig, devices } from '@playwright/test'

const baseUrl = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: baseUrl,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: baseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      HOST: '127.0.0.1',
      NUXT_PUBLIC_APPS_SCRIPT_URL: `${baseUrl}/__test/apps-script`,
      NUXT_PUBLIC_LINE_CHANNEL_ID: 'test-channel-id',
      NUXT_PUBLIC_LINE_REDIRECT_URI: `${baseUrl}/auth/line-callback`,
      NUXT_PUBLIC_REGISTRATION_FORM_URL: `${baseUrl}/__test/registration-form?phone={phone}`,
    },
  },
})
