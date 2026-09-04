import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

test('state written by one remote is read by the other', async ({ page }) => {
  await signIn(page, ACCOUNTS.somchai);

  await page.getByRole('link', { name: 'Catalog' }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Thermal receipt printer' })
    .getByRole('button', { name: 'Add to cart' })
    .click();

  // The shell header reads the same store the catalog remote just wrote to.
  await expect(page.getByTitle('Shared cart state, written by mfe-catalog')).toContainText('cart 1');

  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByText('Thermal receipt printer')).toBeVisible();

  await page.getByRole('button', { name: 'Place order from cart' }).click();
  await expect(page.getByRole('status')).toContainText('emptied the cart');
  await expect(page.getByTitle('Shared cart state, written by mfe-catalog')).toContainText('cart 0');

  // mfe-catalog and mfe-orders never import each other; the platform singleton
  // is the only thing between them.
  await expect(page.getByRole('cell', { name: 'ORD-24003' })).toBeVisible();
});
