import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Dedicated ports for the E2E stack so it never collides with a developer's
// regular `dotnet run` / `npm run dev` instances (which use 5279 / 5173 against
// the normal dev database).
const API_PORT = 5280;
const WEB_PORT = 5174;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },

  projects: [
    // Logs in as the seeded admin once and saves storage state (incl. the
    // localStorage-based auth token) for reuse by tests that need an
    // authenticated staff session, so they don't each redo the login UI flow.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
  ],

  // Starts the API (against HelpdeskDb_Test, via ASPNETCORE_ENVIRONMENT=Testing)
  // and the web app (pointed at that API) before the test run, and tears them
  // down after. `--no-launch-profile` keeps this independent of launchSettings.json
  // so the env vars below are the only source of truth for the test run.
  webServer: [
    {
      name: 'api',
      command: `dotnet run --no-launch-profile --urls ${API_URL}`,
      cwd: path.resolve(import.meta.dirname, '../src/HELPDESK.Api'),
      url: `${API_URL}/api/tickets`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Testing',
      },
    },
    {
      name: 'web',
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: path.resolve(import.meta.dirname, '../web'),
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_API_BASE_URL: API_URL,
      },
    },
  ],
});
