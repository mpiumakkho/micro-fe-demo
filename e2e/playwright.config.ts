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
    {
      // Every app behind one origin under path prefixes. single-origin.spec.ts
      // checks that the composition still works there, with a policy that names
      // no remote origins at all.
      command:
        'node deploy/serve-composed.mjs 4500 .=apps/shell/dist/shell/browser remotes/mfe-orders=apps/mfe-orders/dist/mfe-orders/browser remotes/mfe-catalog=apps/mfe-catalog/dist/mfe-catalog/browser',
      cwd: '..',
      url: 'http://localhost:4500/remotes/mfe-orders/remoteEntry.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      // The shell again, this time with a Content-Security-Policy. csp.spec.ts
      // runs the whole flow against it so a policy that breaks federation is
      // caught here rather than in production.
      command:
        'node deploy/serve-static.mjs apps/shell/dist/shell/browser 4400 http://localhost:4201 http://localhost:4202',
      cwd: '..',
      url: 'http://localhost:4400/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      // The same catalog build served from a second origin. relocate.spec.ts
      // repoints the shell here through the manifest alone, which is how a
      // remote moving to a new host is meant to work.
      command: 'node deploy/serve-static.mjs apps/mfe-catalog/dist/mfe-catalog/browser 4302',
      cwd: '..',
      url: 'http://localhost:4302/remoteEntry.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
