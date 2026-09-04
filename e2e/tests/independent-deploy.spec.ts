import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ACCOUNTS, buildIdOf, signIn } from './helpers';

/**
 * The decisive test for question 1.
 *
 * It rebuilds mfe-catalog only, then checks that the shell and mfe-orders are
 * serving byte-identical builds while the catalog changed. Rebuilding inside a
 * test is unusual, but nothing weaker actually answers the question: reading
 * the config only shows intent, and clicking around only shows one moment.
 */
test('rebuilding one remote leaves the shell and the other remote untouched', async ({ page }) => {
  test.setTimeout(120_000);

  async function readBuildIds() {
    await page.goto('/');
    await page.getByRole('link', { name: 'Catalog' }).click();
    await expect(page.getByText('Served by mfe-catalog')).toBeVisible();
    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page.getByText('Served by mfe-orders')).toBeVisible();

    return {
      shell: await buildIdOf(page, 'shell'),
      catalog: await buildIdOf(page, 'mfe-catalog'),
      orders: await buildIdOf(page, 'mfe-orders'),
    };
  }

  await signIn(page, ACCOUNTS.somchai);
  const before = await readBuildIds();

  // Only this app is rebuilt. No shell release, no orders release, no change to
  // the shell's federation.manifest.json.
  execFileSync('npm', ['run', 'build'], {
    cwd: new URL('../../apps/mfe-catalog', import.meta.url),
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  const after = await readBuildIds();

  expect(after.catalog).not.toBe(before.catalog);
  expect(after.shell).toBe(before.shell);
  expect(after.orders).toBe(before.orders);
});
