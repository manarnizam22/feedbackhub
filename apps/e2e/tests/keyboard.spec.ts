import { expect, test } from '@playwright/test';

/* Keyboard-only pass of the core journey: no mouse events at all. */

test('keyboard-only: navigate, vote, open detail, menu round-trip', async ({ page }) => {
  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: 'Requests' })).toBeVisible();

  const voteButton = page.getByRole('button', { name: /Vote for Dark mode/ });
  const before = Number(await voteButton.innerText());
  await voteButton.focus();
  await page.keyboard.press('Enter');
  await expect(voteButton).toContainText(String(before + 1));
  await page.keyboard.press('Enter');
  await expect(voteButton).toContainText(String(before));

  const titleLink = page.getByRole('link', { name: /Dark mode for the dashboard/ });
  await titleLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Dark mode/ })).toBeVisible();

  const account = page.getByRole('button', { name: 'Account menu' });
  await account.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeHidden();
  await expect(account).toBeFocused();
});
