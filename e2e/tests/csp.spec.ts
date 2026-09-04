import { expect, test } from '@playwright/test';

/**
 * Federation loads code from other origins, so the policy that allows it is
 * part of the architecture rather than a deployment detail. The measured
 * minimum for this stack is in docs/findings.md; this test fails if a future
 * change either breaks under that policy or starts needing a looser one.
 */
test('the composed page works under a content security policy', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) {
      violations.push(message.text().split('\n')[0]);
    }
  });

  const response = await page.goto('http://localhost:4400/login');
  const policy = response?.headers()['content-security-policy'] ?? '';

  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  // The relaxations the stack forces, pinned so a silent widening is visible.
  expect(policy).toContain('blob:');
  expect(policy).not.toContain("'unsafe-eval'");

  await page.getByLabel('Username').fill('somchai');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('banner').getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByText('Served by mfe-orders')).toBeVisible();

  await page.getByRole('link', { name: 'Catalog' }).click();
  await expect(page.getByText('Served by mfe-catalog')).toBeVisible();

  expect(violations).toEqual([]);
});
