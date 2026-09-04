import { expect, test } from '@playwright/test';
import { ACCOUNTS, appsInEvidenceTable, signIn } from './helpers';

test.describe('runtime composition', () => {
  test('the shell loads both remotes and shares one platform instance', async ({ page }) => {
    await signIn(page, ACCOUNTS.somchai);

    // Only the shell has registered a build so far - remotes register when loaded.
    expect(await appsInEvidenceTable(page)).toEqual(['shell']);

    await page.getByRole('link', { name: 'Catalog' }).click();
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
    await expect(page.getByText('Served by mfe-catalog')).toBeVisible();

    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByText('Served by mfe-orders')).toBeVisible();

    const apps = await appsInEvidenceTable(page);
    expect(apps.sort()).toEqual(['mfe-catalog', 'mfe-orders', 'shell']);

    // If the shared package had been duplicated, each app would hold its own
    // state and the remotes' registrations would never reach this table.
    await expect(page.getByText('platform singleton: ok')).toBeVisible();
  });

  test('a remote owns its own inner routes', async ({ page }) => {
    await signIn(page, ACCOUNTS.somchai);
    await page.getByRole('link', { name: 'Catalog' }).click();

    await page.getByRole('link', { name: 'sku-1002' }).click();

    // The shell never declared this route; it came from the remote's table.
    await expect(page).toHaveURL(/\/catalog\/sku-1002$/);
    await expect(page.getByRole('heading', { name: 'Barcode scanner, 2D' })).toBeVisible();
  });
});
