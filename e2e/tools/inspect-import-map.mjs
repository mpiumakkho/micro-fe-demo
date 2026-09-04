/**
 * Prints how the browser resolved each shared package after federation ran.
 *
 * This is the fastest way to answer "is Angular loaded once or twice?", which
 * is the failure that produces NG0203 / NG0200 in a composed page. Every scope
 * pointing at the same file means one instance; a scope pointing at another
 * origin means a second copy and broken dependency injection.
 *
 *   node e2e/tools/inspect-import-map.mjs [package ...]
 *
 * Defaults to @angular/core and @mfe-demo/platform. Requires the three servers
 * to be running - see docs/runbook.md.
 */
import { chromium } from '@playwright/test';

const packages = process.argv.slice(2);
const watched = packages.length > 0 ? packages : ['@angular/core', '@mfe-demo/platform'];

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto('http://localhost:4200/login');
  await page.getByLabel('Username').fill('somchai');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).waitFor();

  // A remote's shared packages only enter the import map once it is loaded.
  for (const link of ['Orders', 'Catalog']) {
    await page.getByRole('link', { name: link }).click();
    await page.waitForTimeout(500);
  }

  const maps = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('script[type="importmap-shim"],script[type="importmap"]'),
    ).map((script) => script.textContent ?? ''),
  );

  for (const raw of maps) {
    const map = JSON.parse(raw);

    for (const name of watched) {
      const root = map.imports?.[name];
      const scoped = Object.entries(map.scopes ?? {})
        .filter(([, imports]) => imports[name])
        .map(([scope, imports]) => [scope, imports[name]]);

      const distinct = new Set([root, ...scoped.map(([, url]) => url)].filter(Boolean));

      console.log(`\n${name}`);
      console.log(`  root  -> ${root ?? '(not shared by the host)'}`);
      for (const [scope, url] of scoped) {
        console.log(`  ${scope} -> ${url}`);
      }
      console.log(distinct.size === 1 ? '  => one instance' : `  => ${distinct.size} INSTANCES`);
    }
  }
} finally {
  await browser.close();
}
