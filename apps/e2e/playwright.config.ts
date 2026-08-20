import { defineConfig } from '@playwright/test';

/* Runs against the local dev stack (compose Keycloak/Postgres + dev servers on
   :4200/:3010). Single worker: the suites share one seeded database. */
export default defineConfig({
  testDir: './tests',
  /* generous: the first request after a dev-server restart pays a cold
     compile; CI against prod builds could tighten this */
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'user',
      testMatch: /user-journey|keyboard/,
      dependencies: ['setup'],
      use: { storageState: '.auth/alice.json' },
    },
    {
      name: 'admin',
      testMatch: /admin-journey/,
      dependencies: ['setup'],
      use: { storageState: '.auth/admin.json' },
    },
  ],
});
