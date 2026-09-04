/**
 * Measures what the browser actually downloads for the composed page.
 *
 * Each app reports its own bundle size at build time, but nobody measures the
 * page a user ends up with: the shell plus every remote plus one copy of the
 * shared framework. This walks the full flow and reports transferred bytes by
 * origin and by file, which is the number a bundle budget should be set on.
 *
 *   node e2e/tools/measure-payload.mjs
 *
 * Requires the three servers to be running; see docs/runbook.md.
 */
import { chromium } from '@playwright/test';

const ORIGIN_LABELS = {
  'http://localhost:4200': 'shell',
  'http://localhost:4201': 'mfe-orders',
  'http://localhost:4202': 'mfe-catalog',
};

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(15000);

/** @type {{url: string, origin: string, bytes: number}[]} */
const downloads = [];

page.on('requestfinished', async (request) => {
  try {
    const sizes = await request.sizes();
    const url = new URL(request.url());
    downloads.push({
      url: url.pathname,
      origin: url.origin,
      bytes: sizes.responseBodySize + sizes.responseHeadersSize,
    });
  } catch {
    // A request that was aborted or served from cache has no sizes; skipping it
    // under-reports rather than inventing a number.
  }
});

try {
  await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill('somchai');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).waitFor();

  for (const link of ['Catalog', 'Orders']) {
    await page.getByRole('link', { name: link }).click();
    await page.waitForLoadState('networkidle');
  }

  const byOrigin = new Map();
  for (const item of downloads) {
    byOrigin.set(item.origin, (byOrigin.get(item.origin) ?? 0) + item.bytes);
  }

  const total = downloads.reduce((sum, item) => sum + item.bytes, 0);
  const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(8) + ' kB';

  console.log('transferred for the composed page (shell + both remotes)\n');
  for (const [origin, bytes] of [...byOrigin].sort((a, b) => b[1] - a[1])) {
    const label = ORIGIN_LABELS[origin] ?? origin;
    console.log(`  ${label.padEnd(12)} ${kb(bytes)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${kb(total)}   in ${downloads.length} requests\n`);

  console.log('ten largest files');
  for (const item of [...downloads].sort((a, b) => b.bytes - a.bytes).slice(0, 10)) {
    const label = ORIGIN_LABELS[item.origin] ?? item.origin;
    console.log(`  ${kb(item.bytes)}  ${label.padEnd(12)} ${item.url}`);
  }
} finally {
  await browser.close();
  process.exit(0);
}
