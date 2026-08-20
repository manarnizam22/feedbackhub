/* FH-19: notification rows are written in the same transaction as the mutation
   and delivered per recipient. Real tokens, real DB; itest data cleaned up. */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq, inArray, like } from 'drizzle-orm';
import {
  appSettings,
  comments,
  createDb,
  feedbackRequests,
  notifications,
  userPreferences,
  votes,
} from '@feedbackhub/db';
import { NotificationsResponseSchema, RequestDetailSchema } from '@feedbackhub/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter.js';

const KEYCLOAK = 'http://localhost:8080/realms/feedbackhub';
const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_BUG = 'a1000000-0000-4000-8000-000000000001';

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

describe('notifications (integration)', () => {
  let app: NestFastifyApplication;
  let alice: string;
  let admin: string;
  const { db, pool } = createDb();
  const settingsSnapshot = new Map<string, unknown>();

  const snapshotSetting = async (key: string) => {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
    settingsSnapshot.set(key, rows[0]?.value);
  };

  const restoreSetting = async (key: string) => {
    if (settingsSnapshot.has(key)) {
      await db
        .update(appSettings)
        .set({ value: settingsSnapshot.get(key) })
        .where(eq(appSettings.key, key));
    }
  };

  const call = (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    token: string,
    payload?: unknown,
  ) =>
    app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        headers: { authorization: `Bearer ${token}` },
        ...(payload !== undefined ? { payload: payload as Record<string, unknown> } : {}),
      });

  const createRequest = async (token: string, title: string) => {
    const res = await call('POST', '/requests', token, {
      title: `itest-notif: ${title}`,
      description: 'notification integration test request body',
      categoryId: CATEGORY_BUG,
    });
    expect(res.statusCode).toBe(201);
    return RequestDetailSchema.parse(res.json());
  };

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      logger: false,
    });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    alice = await getToken('alice@dev.local', 'alice-dev');
    admin = await getToken('admin@dev.local', 'admin-dev');
    await snapshotSetting('submissions_per_user_per_day');
    await snapshotSetting('comments_require_approval');
    await db
      .update(appSettings)
      .set({ value: 100 })
      .where(eq(appSettings.key, 'submissions_per_user_per_day'));
  });

  afterAll(async () => {
    const rows = await db
      .select({ id: feedbackRequests.id })
      .from(feedbackRequests)
      .where(like(feedbackRequests.title, 'itest-notif:%'));
    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      await db.delete(notifications).where(inArray(notifications.requestId, ids));
      await db.delete(votes).where(inArray(votes.requestId, ids));
      await db.delete(comments).where(inArray(comments.requestId, ids));
      await db.delete(feedbackRequests).where(inArray(feedbackRequests.id, ids));
    }
    await db
      .update(userPreferences)
      .set({ notifyOnComment: true })
      .where(eq(userPreferences.userId, ALICE_ID));
    await restoreSetting('submissions_per_user_per_day');
    await restoreSetting('comments_require_approval');
    await app.close();
    await pool.end();
  });

  it('a new request notifies everyone except the author', async () => {
    const created = await createRequest(admin, 'fanout');
    const mine = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(mine.items.some((n) => n.requestId === created.id && n.type === 'new_request')).toBe(
      true,
    );
    const authors = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', admin)).json(),
    );
    expect(authors.items.some((n) => n.requestId === created.id)).toBe(false);
  });

  it('a vote notifies the request author; voting your own does not', async () => {
    const created = await createRequest(alice, 'vote-notify');
    await call('PUT', `/requests/${created.id}/vote`, admin);
    const forAlice = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(forAlice.items.some((n) => n.requestId === created.id && n.type === 'vote')).toBe(true);

    const own = await createRequest(alice, 'self-vote');
    await call('PUT', `/requests/${own.id}/vote`, alice);
    const after = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(after.items.some((n) => n.requestId === own.id && n.type === 'vote')).toBe(false);
  });

  it('comment notifications respect the notifyOnComment preference', async () => {
    await db
      .update(userPreferences)
      .set({ notifyOnComment: false })
      .where(eq(userPreferences.userId, ALICE_ID));
    const created = await createRequest(alice, 'muted');
    await call('POST', `/requests/${created.id}/comments`, admin, { body: 'muted comment' });
    const muted = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(muted.items.some((n) => n.requestId === created.id && n.type === 'comment')).toBe(false);

    await db
      .update(userPreferences)
      .set({ notifyOnComment: true })
      .where(eq(userPreferences.userId, ALICE_ID));
    await call('POST', `/requests/${created.id}/comments`, admin, { body: 'audible comment' });
    const audible = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(audible.items.some((n) => n.requestId === created.id && n.type === 'comment')).toBe(
      true,
    );
  });

  it('moderation lifecycle notifies the right people: pending→admins, approved→author, pin→author', async () => {
    await db
      .update(appSettings)
      .set({ value: true })
      .where(eq(appSettings.key, 'comments_require_approval'));

    const created = await createRequest(alice, 'moderation-notify');
    const posted = await call('POST', `/requests/${created.id}/comments`, alice, {
      body: 'pending comment from alice',
    });
    const commentId = posted.json().id;

    const adminInbox = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', admin)).json(),
    );
    expect(
      adminInbox.items.some((n) => n.requestId === created.id && n.type === 'comment_pending'),
    ).toBe(true);

    await call('POST', `/comments/${commentId}/approve`, admin);
    const aliceInbox = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(
      aliceInbox.items.some((n) => n.requestId === created.id && n.type === 'comment_approved'),
    ).toBe(true);

    await call('PUT', `/requests/${created.id}/pin`, admin);
    const afterPin = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(afterPin.items.some((n) => n.requestId === created.id && n.type === 'pin')).toBe(true);
    await call('DELETE', `/requests/${created.id}/pin`, admin);

    await db
      .update(appSettings)
      .set({ value: false })
      .where(eq(appSettings.key, 'comments_require_approval'));
  });

  it('mark-all-read zeroes the unread count', async () => {
    const before = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(before.unread).toBeGreaterThan(0);
    const marked = await call('POST', '/me/notifications/read', alice);
    expect(marked.statusCode).toBe(204);
    const after = NotificationsResponseSchema.parse(
      (await call('GET', '/me/notifications', alice)).json(),
    );
    expect(after.unread).toBe(0);
  });
});
