import { expect, test as setup } from '@playwright/test';

/* Real Keycloak login through the themed page; the saved storage state carries
   the SSO cookies, so every test starts already authenticated. */
async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/');
  await page.waitForURL(/localhost:8080/);
  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('#kc-login');
  await page.waitForURL(/localhost:4200/);
  await expect(page.getByRole('heading', { name: 'Requests' })).toBeVisible();
}

setup('authenticate alice', async ({ page }) => {
  await login(page, 'alice@dev.local', 'alice-dev');
  await page.context().storageState({ path: '.auth/alice.json' });
});

setup('authenticate admin', async ({ page }) => {
  await login(page, 'admin@dev.local', 'admin-dev');
  await page.context().storageState({ path: '.auth/admin.json' });
});

/* The rate limit is a feature under test elsewhere (integration); in e2e it
   only makes reruns flaky — every created request counts against the daily
   quota. Raise it for the run. */
setup('prepare test data', async ({ request }) => {
  const tokenResponse = await request.post(
    'http://localhost:8080/realms/feedbackhub/protocol/openid-connect/token',
    {
      form: {
        grant_type: 'password',
        client_id: 'feedbackhub-web',
        username: 'admin@dev.local',
        password: 'admin-dev',
        scope: 'openid',
      },
    },
  );
  const { access_token } = (await tokenResponse.json()) as { access_token: string };
  const headers = { Authorization: `Bearer ${access_token}` };
  const settings = await (
    await request.get('http://localhost:3010/admin/settings', { headers })
  ).json();
  await request.put('http://localhost:3010/admin/settings', {
    headers,
    data: { ...settings, submissionsPerUserPerDay: 1000 },
  });
});
