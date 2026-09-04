import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

test('an unauthorised user never downloads the remote', async ({ page }) => {
  const ordersRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http://localhost:4201')) {
      ordersRequests.push(request.url());
    }
  });

  await signIn(page, ACCOUNTS.pranee);

  await expect(page.getByRole('link', { name: 'Catalog' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Orders' })).toHaveCount(0);

  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: /do not have access/i })).toBeVisible();

  // canMatch runs before loadChildren, so nothing from the orders origin is
  // fetched - not even its remoteEntry.json exposed-module bundle.
  const bundleRequests = ordersRequests.filter((url) => url.endsWith('.js'));
  expect(bundleRequests).toEqual([]);
});

test('a remote that is unreachable does not take the shell down', async ({ page }) => {
  // Simulates the orders deployment being offline while the shell is healthy.
  await page.route('http://localhost:4201/**', (route) => route.abort('connectionrefused'));

  await signIn(page, ACCOUNTS.somchai);

  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByRole('heading', { name: /temporarily unavailable/i })).toBeVisible();

  // The shell and the healthy remote keep working.
  await page.getByRole('link', { name: 'Catalog' }).click();
  await expect(page.getByText('Served by mfe-catalog')).toBeVisible();
});
