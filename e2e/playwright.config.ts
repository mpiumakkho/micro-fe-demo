import { defineConfig } from '@playwright/test';

/**
 * Runs against the production builds served as three separate origins, which is
 * the arrangement the evaluation is about. Run `npm run build` in each app
 * first; the servers below only serve what is already in dist/.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node deploy/serve-static.mjs apps/shell/dist/shell/browser 4200',
      cwd: '..',
      url: 'http://localhost:4200/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'node deploy/serve-static.mjs apps/mfe-orders/dist/mfe-orders/browser 4201',
      cwd: '..',
      url: 'http://localhost:4201/remoteEntry.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'node deploy/serve-static.mjs apps/mfe-catalog/dist/mfe-catalog/browser 4202',
      cwd: '..',
      url: 'http://localhost:4202/remoteEntry.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
