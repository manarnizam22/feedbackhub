/* Integration against the real compose stack: real Keycloak tokens (password
   grant, dev realm only), real JWKS verification, real Postgres. No mocked
   guards — the thing tested is the thing that runs. Requires `pnpm docker:up`
   + migrate + seed. */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { BootstrapResponseSchema } from '@feedbackhub/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter.js';

const KEYCLOAK = 'http://localhost:8080/realms/feedbackhub';

async function getToken(username: string, password: string): Promise<string> {
  const response = await fetch(`${KEYCLOAK}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'feedbackhub-web',
      username,
      password,
      scope: 'openid',
    }),
  });
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

describe('auth guard + bootstrap (integration)', () => {
  let app: NestFastifyApplication;
  let aliceToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      logger: false,
    });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    aliceToken = await getToken('alice@dev.local', 'alice-dev');
    adminToken = await getToken('admin@dev.local', 'admin-dev');
  });

  afterAll(async () => {
    await app.close();
  });

  const inject = (headers: Record<string, string> = {}) =>
    app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/bootstrap', headers });

  it('health is public', async () => {
    const res = await app.getHttpAdapter().getInstance().inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects a missing token with a problem body', async () => {
    const res = await inject();
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ status: 401, code: 'unauthorized' });
  });

  it('rejects a garbage token', async () => {
    const res = await inject({ authorization: 'Bearer not.a.jwt' });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a real token and returns the full bootstrap payload', async () => {
    const res = await inject({ authorization: `Bearer ${aliceToken}` });
    expect(res.statusCode).toBe(200);
    const body = BootstrapResponseSchema.parse(res.json());
    expect(body.profile.email).toBe('alice@dev.local');
    expect(body.profile.isAdmin).toBe(false);
    expect(body.taxonomy.categories.length).toBeGreaterThanOrEqual(4);
    expect(body.taxonomy.statuses.some((s) => s.isDefault)).toBe(true);
    expect(body.featureFlags).toHaveProperty('compactList');
  });

  it('extracts the admin role from the token', async () => {
    const res = await inject({ authorization: `Bearer ${adminToken}` });
    expect(res.statusCode).toBe(200);
    const body = BootstrapResponseSchema.parse(res.json());
    expect(body.profile.isAdmin).toBe(true);
  });
});
