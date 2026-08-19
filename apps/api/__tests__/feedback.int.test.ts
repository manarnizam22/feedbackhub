/* The authorization matrix from docs/rules/security.md, executed row by row
   against the real stack: real tokens, real JWKS, real Postgres. Test data is
   prefixed 'itest:' and hard-deleted afterwards so reruns stay deterministic. */
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import {
  appSettings,
  auditLog,
  comments,
  createDb,
  feedbackRequests,
  votes,
} from '@feedbackhub/db';
import { ListRequestsResponseSchema, RequestDetailSchema } from '@feedbackhub/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter.js';

const KEYCLOAK = 'http://localhost:8080/realms/feedbackhub';
const CATEGORY_BUG = 'a1000000-0000-4000-8000-000000000001';
const STATUS_PLANNED = 'b1000000-0000-4000-8000-000000000003';
const SEEDED_PINNED = 'c1000000-0000-4000-8000-000000000001';

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

describe('feedback API (integration)', () => {
  let app: NestFastifyApplication;
  let alice: string;
  let admin: string;
  const { db, pool } = createDb();

  const call = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    token?: string,
    payload?: unknown,
  ) =>
    app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        ...(payload !== undefined ? { payload: payload as Record<string, unknown> } : {}),
      });

  const createRequest = async (token: string, title: string) => {
    const res = await call('POST', '/requests', token, {
      title: `itest: ${title}`,
      description: 'integration test request, long enough to pass validation',
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
    await db
      .update(appSettings)
      .set({ value: 100 })
      .where(eq(appSettings.key, 'submissions_per_user_per_day'));
    await db
      .update(appSettings)
      .set({ value: false })
      .where(eq(appSettings.key, 'comments_require_approval'));
  });

  afterAll(async () => {
    const rows = await db
      .select({ id: feedbackRequests.id })
      .from(feedbackRequests)
      .where(like(feedbackRequests.title, 'itest:%'));
    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      await db.delete(votes).where(inArray(votes.requestId, ids));
      await db.delete(comments).where(inArray(comments.requestId, ids));
      await db.delete(feedbackRequests).where(inArray(feedbackRequests.id, ids));
    }
    await db
      .update(appSettings)
      .set({ value: false })
      .where(eq(appSettings.key, 'comments_require_approval'));
    await db
      .update(appSettings)
      .set({ value: 10 })
      .where(eq(appSettings.key, 'submissions_per_user_per_day'));
    await app.close();
    await pool.end();
  });

  describe('list', () => {
    it('returns seeded data, pinned first, contract-exact', async () => {
      const res = await call('GET', '/requests?pageSize=50', alice);
      expect(res.statusCode).toBe(200);
      const body = ListRequestsResponseSchema.parse(res.json());
      expect(body.total).toBeGreaterThanOrEqual(12);
      expect(body.items[0]!.id).toBe(SEEDED_PINNED);
      expect(body.items[0]!.voteCount).toBe(2);
      expect(body.items[0]!.myVote).toBe(true);
    });

    it('filters by category and status', async () => {
      const res = await call(
        'GET',
        `/requests?category=${CATEGORY_BUG}&status=b1000000-0000-4000-8000-000000000005`,
        alice,
      );
      const body = ListRequestsResponseSchema.parse(res.json());
      expect(body.items.every((i) => i.categoryId === CATEGORY_BUG)).toBe(true);
      expect(body.items.some((i) => i.title.includes('Typo'))).toBe(true);
    });

    it('searches text in title and description', async () => {
      const res = await call('GET', '/requests?q=caf%C3%A9', alice);
      const body = ListRequestsResponseSchema.parse(res.json());
      expect(body.items.some((i) => i.title.includes('accented'))).toBe(true);
    });

    it('paginates', async () => {
      const res = await call('GET', '/requests?page=2&pageSize=5', alice);
      const body = ListRequestsResponseSchema.parse(res.json());
      expect(body.items.length).toBe(5);
      expect(body.page).toBe(2);
    });

    it('rejects an invalid query with 422 details', async () => {
      const res = await call('GET', '/requests?pageSize=999', alice);
      expect(res.statusCode).toBe(422);
      expect(res.json().details[0].path).toBe('pageSize');
    });
  });

  describe('requests CRUD + matrix', () => {
    it('anonymous is 401 on every route', async () => {
      for (const [method, url] of [
        ['GET', '/requests'],
        ['POST', '/requests'],
        ['PATCH', `/requests/${SEEDED_PINNED}`],
        ['DELETE', `/requests/${SEEDED_PINNED}`],
        ['PUT', `/requests/${SEEDED_PINNED}/vote`],
      ] as const) {
        const res = await call(method, url);
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
    });

    it('create → appears in list with default status; validation 422 with field details', async () => {
      const created = await createRequest(alice, 'crud lifecycle');
      expect(created.statusName).toBe('New');
      const bad = await call('POST', '/requests', alice, { title: 'x', description: 'short' });
      expect(bad.statusCode).toBe(422);
      const paths = bad.json().details.map((d: { path: string }) => d.path);
      expect(paths).toContain('title');
      expect(paths).toContain('description');
    });

    it('owner edits; non-owner gets 404 (not 403 — existence not leaked)', async () => {
      const created = await createRequest(alice, 'ownership');
      const ownerEdit = await call('PATCH', `/requests/${created.id}`, alice, {
        description: 'edited by owner, still long enough to be valid',
      });
      expect(ownerEdit.statusCode).toBe(200);
      const foreignEdit = await call('PATCH', `/requests/${created.id}`, admin, {
        description: 'admin trying to rewrite someone else words here',
      });
      expect(foreignEdit.statusCode).toBe(404);
    });

    it('owner deletes (soft) → detail 404 for everyone; admin cannot delete foreign', async () => {
      const created = await createRequest(alice, 'deletion');
      const adminDelete = await call('DELETE', `/requests/${created.id}`, admin);
      expect(adminDelete.statusCode).toBe(404);
      const ownerDelete = await call('DELETE', `/requests/${created.id}`, alice);
      expect(ownerDelete.statusCode).toBe(204);
      const gone = await call('GET', `/requests/${created.id}`, admin);
      expect(gone.statusCode).toBe(404);
      const tombstone = await db
        .select({ deletedAt: feedbackRequests.deletedAt })
        .from(feedbackRequests)
        .where(eq(feedbackRequests.id, created.id));
      expect(tombstone[0]!.deletedAt).not.toBeNull();
    });

    it('triage: admin sets status and pins; user gets 403', async () => {
      const created = await createRequest(alice, 'triage');
      const userStatus = await call('PATCH', `/requests/${created.id}/status`, alice, {
        statusId: STATUS_PLANNED,
      });
      expect(userStatus.statusCode).toBe(403);
      const adminStatus = await call('PATCH', `/requests/${created.id}/status`, admin, {
        statusId: STATUS_PLANNED,
      });
      expect(adminStatus.statusCode).toBe(200);
      expect(adminStatus.json().statusName).toBe('Planned');
      const userPin = await call('PUT', `/requests/${created.id}/pin`, alice);
      expect(userPin.statusCode).toBe(403);
      const adminPin = await call('PUT', `/requests/${created.id}/pin`, admin);
      expect(adminPin.statusCode).toBe(204);
    });
  });

  describe('votes', () => {
    it('idempotent cast/withdraw/re-vote keeps the count consistent', async () => {
      const created = await createRequest(admin, 'voting');
      const countNow = async () => {
        const res = await call('GET', `/requests/${created.id}`, alice);
        return RequestDetailSchema.parse(res.json()).voteCount;
      };
      await call('PUT', `/requests/${created.id}/vote`, alice);
      await call('PUT', `/requests/${created.id}/vote`, alice);
      expect(await countNow()).toBe(1);
      await call('DELETE', `/requests/${created.id}/vote`, alice);
      await call('DELETE', `/requests/${created.id}/vote`, alice);
      expect(await countNow()).toBe(0);
      await call('PUT', `/requests/${created.id}/vote`, alice);
      expect(await countNow()).toBe(1);
    });
  });

  describe('comments', () => {
    it('author edits own; foreign edit 404; admin deletes any (moderation)', async () => {
      const created = await createRequest(alice, 'comments');
      const posted = await call('POST', `/requests/${created.id}/comments`, alice, {
        body: 'original comment',
      });
      expect(posted.statusCode).toBe(201);
      const commentId = posted.json().id;

      const foreignEdit = await call('PATCH', `/comments/${commentId}`, admin, {
        body: 'admin rewriting',
      });
      expect(foreignEdit.statusCode).toBe(404);

      const ownEdit = await call('PATCH', `/comments/${commentId}`, alice, { body: 'edited' });
      expect(ownEdit.statusCode).toBe(200);
      expect(ownEdit.json().body).toBe('edited');

      const moderated = await call('DELETE', `/comments/${commentId}`, admin);
      expect(moderated.statusCode).toBe(204);
      const audit = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityId, commentId), eq(auditLog.action, 'comment.delete')));
      expect(audit[0]!.data).toMatchObject({ moderation: true });
    });

    it('approval setting: pending comment visible to author only', async () => {
      await db
        .update(appSettings)
        .set({ value: true })
        .where(eq(appSettings.key, 'comments_require_approval'));
      const created = await createRequest(admin, 'approval');
      const posted = await call('POST', `/requests/${created.id}/comments`, alice, {
        body: 'awaiting approval',
      });
      expect(posted.json().approved).toBe(false);

      const asAuthor = RequestDetailSchema.parse(
        (await call('GET', `/requests/${created.id}`, alice)).json(),
      );
      expect(asAuthor.comments.some((c) => c.body === 'awaiting approval')).toBe(true);

      const asOther = RequestDetailSchema.parse(
        (await call('GET', `/requests/${created.id}`, admin)).json(),
      );
      expect(asOther.comments.some((c) => c.body === 'awaiting approval')).toBe(false);
      await db
        .update(appSettings)
        .set({ value: false })
        .where(eq(appSettings.key, 'comments_require_approval'));
    });
  });

  describe('rate limit', () => {
    it('blocks the Nth+1 submission of the day with 429', async () => {
      const existing = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(feedbackRequests)
        .where(
          and(
            eq(feedbackRequests.authorId, '22222222-2222-4222-8222-222222222222'),
            sql`${feedbackRequests.createdAt} >= date_trunc('day', now())`,
          ),
        );
      await db
        .update(appSettings)
        .set({ value: (existing[0]?.n ?? 0) + 2 })
        .where(eq(appSettings.key, 'submissions_per_user_per_day'));
      await createRequest(admin, 'rate 1');
      await createRequest(admin, 'rate 2');
      const blocked = await call('POST', '/requests', admin, {
        title: 'itest: rate 3',
        description: 'this one should be rejected by the daily limit',
        categoryId: CATEGORY_BUG,
      });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json().code).toBe('rate_limited');
      await db
        .update(appSettings)
        .set({ value: 100 })
        .where(eq(appSettings.key, 'submissions_per_user_per_day'));
    });
  });

  describe('audit trail', () => {
    it('mutations leave audit rows', async () => {
      const created = await createRequest(alice, 'audit');
      const rows = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityId, created.id), eq(auditLog.action, 'request.create')));
      expect(rows.length).toBe(1);
      expect(rows[0]!.actorId).toBe('11111111-1111-4111-8111-111111111111');
    });
  });
});
