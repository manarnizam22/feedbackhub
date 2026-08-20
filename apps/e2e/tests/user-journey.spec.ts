import { expect, test } from '@playwright/test';

/* Journey 3.4 (user): list → search → vote → discuss → submit → edit → delete.
   Runs as alice against seeded data; everything it creates it deletes. Created
   content carries a per-run tag so leftovers from crashed runs can't collide
   with strict-mode locators. */
const tag = `e2e-${Date.now().toString(36)}`;

test('list: seeded data, pinned first, search and filters narrow', async ({ page }) => {
  await page.goto('/requests');
  const cards = page.locator('article');
  await expect(cards.first()).toContainText('Pinned');
  await page.getByLabel('Search requests').fill('café');
  await expect(page.getByText('Search ignores accented characters')).toBeVisible();
  await page.getByLabel('Search requests').fill('zzz-no-such-request');
  await expect(page.getByText('No requests match')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards.first()).toBeVisible();
});

test('voting toggles optimistically and persists', async ({ page }) => {
  await page.goto('/requests');
  const vote = page.getByRole('button', { name: /Vote for Export requests as CSV/ });
  const before = Number(await vote.innerText());
  await vote.click();
  await expect(vote).toContainText(String(before + 1));
  await page.reload();
  await expect(page.getByRole('button', { name: /Vote for Export requests as CSV/ })).toContainText(
    String(before + 1),
  );
  await page.getByRole('button', { name: /Vote for Export requests as CSV/ }).click();
  await expect(page.getByRole('button', { name: /Vote for Export requests as CSV/ })).toContainText(
    String(before),
  );
});

test('discussion: comment, edit, delete own', async ({ page }) => {
  await page.goto('/requests');
  await page.getByRole('link', { name: /Dark mode for the dashboard/ }).click();
  await expect(page.getByRole('heading', { name: /Dark mode/ })).toBeVisible();

  await page.getByLabel('Add a comment').fill(`${tag}: what a great idea`);
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText(`${tag}: what a great idea`)).toBeVisible();

  const commentCard = page.locator('li', { hasText: `${tag}: what a great idea` });
  await commentCard.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Edit comment').fill(`${tag}: edited idea`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`${tag}: edited idea`)).toBeVisible();

  const edited = page.locator('li', { hasText: `${tag}: edited idea` });
  await edited.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText(`${tag}: edited idea`)).toBeHidden();
});

test('submit → appears → edit → delete', async ({ page }) => {
  await page.goto('/requests/new');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText('Title must be at least 3 characters')).toBeVisible();

  await page.getByLabel('Title').fill(`${tag}: journey request`);
  await page.getByLabel('Description').fill('created by the end-to-end user journey test');
  await page.getByLabel('Category').selectOption({ label: 'Feature' });
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('heading', { name: `${tag}: journey request` })).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Description').fill('edited by the end-to-end journey test, still valid');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('edited by the end-to-end journey test')).toBeVisible();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete request' }).click();
  await page.waitForURL(/\/requests$/);
  await expect(page.getByText(`${tag}: journey request`)).toBeHidden();
});
