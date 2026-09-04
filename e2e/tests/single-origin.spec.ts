import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const shellManifest = join(repoRoot, 'apps/shell/dist/shell/browser/federation.manifest.json');

/**
 * The same three builds, served from one origin under path prefixes instead of
 * three hosts.
 *
 * Independent deploy is unaffected, because each prefix is still a separate
 * upload target. What this buys is operational: nothing is cross-origin, so
 * there is no CORS, and the policy names no remote origins, so adding a fourth
 * remote needs no CSP change and no new security review. With separate origins
 * every remote has to be added to the policy by hand.
 */
test('the composition works from one origin with a policy that names no remotes', async ({
  page,
}) => {
  const original = readFileSync(shellManifest, 'utf8');

  const violations: string[] = [];
  const originsContacted = new Set<string>();
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) {
      violations.push(message.text().split('\n')[0]);
    }
  });
  page.on('request', (request) => originsContacted.add(new URL(request.url()).origin));

  try {
    execFileSync('node', ['deploy/apply-manifest.mjs', 'deploy/manifests/single-origin.json'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });

    const response = await page.goto('http://localhost:4500/login');
    const policy = response?.headers()['content-security-policy'] ?? '';

    expect(policy).toContain("script-src 'self' blob: 'unsafe-inline'");
    expect(policy).not.toContain('localhost:4201');
    expect(policy).not.toContain('localhost:4202');

    await page.getByLabel('Username').fill('somchai');
    await page.getByLabel('Password').fill('demo1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('banner').getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page.getByText('Served by mfe-orders')).toBeVisible();

    await page.getByRole('link', { name: 'Catalog' }).click();
    await expect(page.getByText('Served by mfe-catalog')).toBeVisible();

    expect(violations).toEqual([]);
    expect([...originsContacted]).toEqual(['http://localhost:4500']);
  } finally {
    writeFileSync(shellManifest, original);
  }
});
