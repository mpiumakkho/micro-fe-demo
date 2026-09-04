import { expect, type Page } from '@playwright/test';

export const ACCOUNTS = {
  /** Has catalog.view, orders.view and orders.approve. */
  somchai: { username: 'somchai', password: 'demo1234' },
  /** Has catalog.view only, so the orders remote must never be fetched. */
  pranee: { username: 'pranee', password: 'demo1234' },
} as const;

export async function signIn(page: Page, account: { username: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Wait for something that only exists once the session is set. The Home link
  // is visible signed out too, so waiting on it would let the next navigation
  // abort the login that is still in flight.
  // Scoped to the header: the login page renders its own Sign out button the
  // moment the session is set, and an unscoped locator matches both.
  await expect(page.getByRole('banner').getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** Reads the build id the evidence table reports for one app. */
export async function buildIdOf(page: Page, app: string): Promise<string> {
  const row = page.getByRole('row').filter({ hasText: app });
  await expect(row).toHaveCount(1);
  return (await row.getByRole('cell').nth(2).innerText()).trim();
}

export async function appsInEvidenceTable(page: Page): Promise<string[]> {
  const cells = await page.locator('.status tbody tr td:first-child').allInnerTexts();
  return cells.map((text) => text.trim());
}
