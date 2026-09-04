import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/** Uncompressed. deploy/serve-static.mjs sends no gzip or brotli, so these are
 *  raw bytes; a real CDN would transfer roughly a quarter of this. The budget
 *  is set on the raw number because that is what this setup can measure
 *  repeatably. */
const TOTAL_BUDGET_KB = 1000;
const PER_REMOTE_BUDGET_KB = 60;

const REMOTE_ORIGINS = ['http://localhost:4201', 'http://localhost:4202'];

test('a remote adds its own code to the page, not another framework', async ({ page }) => {
  const bytesByOrigin = new Map<string, number>();
  const filesByOrigin = new Map<string, string[]>();

  page.on('requestfinished', async (request) => {
    try {
      const sizes = await request.sizes();
      const url = new URL(request.url());
      bytesByOrigin.set(
        url.origin,
        (bytesByOrigin.get(url.origin) ?? 0) + sizes.responseBodySize + sizes.responseHeadersSize,
      );
      filesByOrigin.set(url.origin, [...(filesByOrigin.get(url.origin) ?? []), url.pathname]);
    } catch {
      // Aborted or cache-served requests report no sizes. Skipping under-reports
      // rather than inventing a number.
    }
  });

  await signIn(page, ACCOUNTS.somchai);
  for (const link of ['Catalog', 'Orders']) {
    await page.getByRole('link', { name: link }).click();
    await page.waitForLoadState('networkidle');
  }

  const totalKb = [...bytesByOrigin.values()].reduce((a, b) => a + b, 0) / 1024;
  expect.soft(totalKb).toBeLessThan(TOTAL_BUDGET_KB);

  for (const origin of REMOTE_ORIGINS) {
    const remoteKb = (bytesByOrigin.get(origin) ?? 0) / 1024;

    // The point of sharing: a remote costs its own feature code and nothing
    // more. If this grows into the hundreds of kB, the framework is being
    // shipped twice and the singleton has quietly broken.
    expect(remoteKb, `${origin} transferred ${remoteKb.toFixed(1)} kB`).toBeLessThan(
      PER_REMOTE_BUDGET_KB,
    );

    // Stronger than the size check and immune to a generous budget.
    const frameworkFiles = (filesByOrigin.get(origin) ?? []).filter((path) =>
      path.includes('_angular_core'),
    );
    expect(frameworkFiles, `${origin} served its own Angular`).toEqual([]);
  }
});
