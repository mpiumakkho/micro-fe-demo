import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { ACCOUNTS, buildIdOf, signIn } from './helpers';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const shellManifest = join(repoRoot, 'apps/shell/dist/shell/browser/federation.manifest.json');

/**
 * The second half of question 1. Rebuilding one remote is only useful if the
 * shell can also be pointed at a different origin without a rebuild, which is
 * what happens when a remote moves host or an environment differs.
 *
 * Nothing is compiled here: the only change is which manifest file the shell
 * serves.
 */
test('a remote can be moved to another origin by replacing the manifest', async ({ page }) => {
  const original = readFileSync(shellManifest, 'utf8');

  const relocated = join(mkdtempSync(join(tmpdir(), 'mfe-manifest-')), 'relocated.json');
  writeFileSync(
    relocated,
    JSON.stringify(
      {
        'mfe-orders': 'http://localhost:4201/remoteEntry.json',
        'mfe-catalog': 'http://localhost:4302/remoteEntry.json',
      },
      null,
      2,
    ),
  );

  try {
    await signIn(page, ACCOUNTS.somchai);
    const shellBuildBefore = await buildIdOf(page, 'shell');

    execFileSync('node', ['deploy/apply-manifest.mjs', relocated], {
      cwd: repoRoot,
      stdio: 'ignore',
    });

    const fromNewOrigin: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith('http://localhost:4302')) {
        fromNewOrigin.push(request.url());
      }
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Catalog' }).click();
    await expect(page.getByText('Served by mfe-catalog')).toBeVisible();

    // The catalog now comes from the new origin, and the shell is the build it
    // already was.
    expect(fromNewOrigin.some((url) => url.endsWith('/remoteEntry.json'))).toBe(true);
    expect(await buildIdOf(page, 'shell')).toBe(shellBuildBefore);
  } finally {
    writeFileSync(shellManifest, original);
  }
});
