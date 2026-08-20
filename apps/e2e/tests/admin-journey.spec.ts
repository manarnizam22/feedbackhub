import { expect, test } from '@playwright/test';

/* Journey 3.4 (admin): triage on the detail page, admin area reachable. */

test('admin menu and admin page are available', async ({ page }) => {
  await page.goto('/requests');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await expect(page.getByText('Comments awaiting approval')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
});

test('triage: status change and pin from the detail page', async ({ page }) => {
  await page.goto('/requests/c1000000-0000-4000-8000-000000000004');
  await expect(page.getByRole('heading', { name: /Slow list loading/ })).toBeVisible();
  await page.getByLabel('Set status').selectOption({ label: 'Under Review' });
  await expect(page.locator('article').getByText('Under Review').first()).toBeVisible();
  await page.getByLabel('Set status').selectOption({ label: 'New' });

  await page.getByRole('button', { name: 'Pin', exact: true }).click();
  await expect(page.getByText('📌 Pinned')).toBeVisible();
  await page.getByRole('button', { name: 'Unpin' }).click();
  await expect(page.getByText('📌 Pinned')).toBeHidden();
});
