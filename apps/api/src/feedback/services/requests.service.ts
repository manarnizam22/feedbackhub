import {
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import { categories, comments, feedbackRequests, statuses, users, votes } from '@feedbackhub/db';
import { subject, type AppAbility } from '@feedbackhub/auth';
import type {
  CreateRequest,
  ListRequestsQuery,
  ListRequestsResponse,
  RequestDetail,
  RequestListItem,
  UpdateRequest,
} from '@feedbackhub/types';

import { AuditService, type Tx } from '../../common/audit.service.js';
import { DB, type Db } from '../../common/db.module.js';
import { SettingsService } from '../../settings/services/settings.service.js';

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

@Injectable()
export class RequestsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private voteCount() {
    return sql<number>`(select count(*)::int from ${votes} v where v.request_id = ${feedbackRequests.id} and v.deleted_at is null)`;
  }

  private commentCount(userId: string, isAdmin: boolean) {
    return sql<number>`(select count(*)::int from ${comments} c where c.request_id = ${feedbackRequests.id} and c.deleted_at is null and (c.approved or c.author_id = ${userId} or ${isAdmin}))`;
  }

  private myVote(userId: string) {
    return sql<boolean>`exists(select 1 from ${votes} v where v.request_id = ${feedbackRequests.id} and v.user_id = ${userId} and v.deleted_at is null)`;
  }

  private baseSelect(userId: string, isAdmin = false) {
    return {
      id: feedbackRequests.id,
      title: feedbackRequests.title,
      description: feedbackRequests.description,
      categoryId: feedbackRequests.categoryId,
      categoryName: categories.name,
      statusId: feedbackRequests.statusId,
      statusName: statuses.name,
      authorId: feedbackRequests.authorId,
      authorName: users.displayName,
      pinned: feedbackRequests.pinned,
      voteCount: this.voteCount(),
      commentCount: this.commentCount(userId, isAdmin),
      myVote: this.myVote(userId),
      createdAt: feedbackRequests.createdAt,
      updatedAt: feedbackRequests.updatedAt,
    };
  }

  private toItem(row: Record<string, unknown>): RequestListItem {
    return {
      ...(row as Omit<RequestListItem, 'createdAt' | 'updatedAt'>),
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    };
  }

  async list(userId: string, query: ListRequestsQuery): Promise<ListRequestsResponse> {
    const conditions: SQL[] = [isNull(feedbackRequests.deletedAt)];
    if (query.status) {
      conditions.push(eq(feedbackRequests.statusId, query.status));
    }
    if (query.category) {
      conditions.push(eq(feedbackRequests.categoryId, query.category));
    }
    if (query.mine) {
      conditions.push(eq(feedbackRequests.authorId, userId));
    }
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      conditions.push(
        or(
          sql`${feedbackRequests.title} ilike ${pattern}`,
          sql`${feedbackRequests.description} ilike ${pattern}`,
        ) as SQL,
      );
    }
    const where = and(...conditions);

    const orderMap = {
      newest: desc(feedbackRequests.createdAt),
      oldest: asc(feedbackRequests.createdAt),
      votes: desc(this.voteCount()),
      comments: desc(this.commentCount(userId, false)),
    } as const;

    const [rows, totals] = await Promise.all([
      this.db
        .select(this.baseSelect(userId))
        .from(feedbackRequests)
        .innerJoin(categories, eq(feedbackRequests.categoryId, categories.id))
        .innerJoin(statuses, eq(feedbackRequests.statusId, statuses.id))
        .innerJoin(users, eq(feedbackRequests.authorId, users.id))
        .where(where)
        .orderBy(desc(feedbackRequests.pinned), orderMap[query.sort])
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(feedbackRequests).where(where),
    ]);

    return {
      items: rows.map((row) => this.toItem(row)),
      total: totals[0]?.total ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(userId: string, id: string, isAdmin = false): Promise<RequestDetail> {
    const rows = await this.db
      .select(this.baseSelect(userId, isAdmin))
      .from(feedbackRequests)
      .innerJoin(categories, eq(feedbackRequests.categoryId, categories.id))
      .innerJoin(statuses, eq(feedbackRequests.statusId, statuses.id))
      .innerJoin(users, eq(feedbackRequests.authorId, users.id))
      .where(and(eq(feedbackRequests.id, id), isNull(feedbackRequests.deletedAt)))
      .limit(1);
    const request = rows[0];
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const commentRows = await this.db
      .select({
        id: comments.id,
        requestId: comments.requestId,
        authorId: comments.authorId,
        authorName: users.displayName,
        body: comments.body,
        approved: comments.approved,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.requestId, id),
          isNull(comments.deletedAt),
          or(eq(comments.approved, true), eq(comments.authorId, userId), sql`${isAdmin}`),
        ),
      )
      .orderBy(asc(comments.createdAt));

    return {
      ...this.toItem(request),
      comments: commentRows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async create(userId: string, input: CreateRequest): Promise<RequestDetail> {
    const limit = await this.settings.getNumberSetting('submissions_per_user_per_day', 10);
    const created = await this.audit.transaction<string>(
      (id) => ({ actorId: userId, action: 'request.create', entityType: 'request', entityId: id }),
      async (tx) => {
        const todayCount = await tx
          .select({ n: count() })
          .from(feedbackRequests)
          .where(
            and(
              eq(feedbackRequests.authorId, userId),
              sql`${feedbackRequests.createdAt} >= date_trunc('day', now())`,
            ),
          );
        if ((todayCount[0]?.n ?? 0) >= limit) {
          throw new HttpException(
            { message: `Daily submission limit of ${limit} reached - try again tomorrow` },
            429,
          );
        }

        await this.assertActiveCategory(tx, input.categoryId);

        const defaultStatus = await tx
          .select({ id: statuses.id })
          .from(statuses)
          .where(eq(statuses.isDefault, true))
          .limit(1);
        if (!defaultStatus[0]) {
          throw new InternalServerErrorException('No default status configured');
        }

        const inserted = await tx
          .insert(feedbackRequests)
          .values({
            title: input.title,
            description: input.description,
            categoryId: input.categoryId,
            statusId: defaultStatus[0].id,
            authorId: userId,
          })
          .returning({ id: feedbackRequests.id });
        return inserted[0]!.id;
      },
    );
    return this.detail(userId, created);
  }

  async update(
    userId: string,
    ability: AppAbility,
    id: string,
    input: UpdateRequest,
  ): Promise<RequestDetail> {
    await this.audit.transaction(
      {
        actorId: userId,
        action: 'request.update',
        entityType: 'request',
        entityId: id,
        data: input,
      },
      async (tx) => {
        const row = await this.getLiveRow(tx, id);
        if (!ability.can('update', subject('Request', { authorId: row.authorId }))) {
          throw new NotFoundException('Request not found');
        }
        if (input.categoryId) {
          await this.assertActiveCategory(tx, input.categoryId);
        }
        await tx
          .update(feedbackRequests)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(feedbackRequests.id, id));
      },
    );
    return this.detail(userId, id);
  }

  async remove(userId: string, ability: AppAbility, id: string): Promise<void> {
    await this.audit.transaction(
      { actorId: userId, action: 'request.delete', entityType: 'request', entityId: id },
      async (tx) => {
        const row = await this.getLiveRow(tx, id);
        if (!ability.can('delete', subject('Request', { authorId: row.authorId }))) {
          throw new NotFoundException('Request not found');
        }
        await tx
          .update(feedbackRequests)
          .set({ deletedAt: new Date(), deletedBy: userId })
          .where(eq(feedbackRequests.id, id));
      },
    );
  }

  async setStatus(
    userId: string,
    ability: AppAbility,
    id: string,
    statusId: string,
  ): Promise<RequestDetail> {
    if (!ability.can('setStatus', 'Request')) {
      throw new ForbiddenException('Admin role required');
    }
    await this.audit.transaction(
      {
        actorId: userId,
        action: 'request.set_status',
        entityType: 'request',
        entityId: id,
        data: { statusId },
      },
      async (tx) => {
        await this.getLiveRow(tx, id);
        const status = await tx
          .select({ id: statuses.id })
          .from(statuses)
          .where(and(eq(statuses.id, statusId), eq(statuses.active, true)))
          .limit(1);
        if (!status[0]) {
          throw new UnprocessableEntityException({
            message: 'Validation failed',
            details: [{ path: 'statusId', message: 'Unknown or inactive status' }],
          });
        }
        await tx
          .update(feedbackRequests)
          .set({ statusId, updatedAt: new Date() })
          .where(eq(feedbackRequests.id, id));
      },
    );
    return this.detail(userId, id);
  }

  async setPinned(userId: string, ability: AppAbility, id: string, pinned: boolean): Promise<void> {
    if (!ability.can('pin', 'Request')) {
      throw new ForbiddenException('Admin role required');
    }
    await this.audit.transaction(
      {
        actorId: userId,
        action: pinned ? 'request.pin' : 'request.unpin',
        entityType: 'request',
        entityId: id,
      },
      async (tx) => {
        await this.getLiveRow(tx, id);
        await tx
          .update(feedbackRequests)
          .set({ pinned, updatedAt: new Date() })
          .where(eq(feedbackRequests.id, id));
      },
    );
  }

  private async getLiveRow(executor: Pick<Db, 'select'> | Tx, id: string) {
    const rows = await executor
      .select({ id: feedbackRequests.id, authorId: feedbackRequests.authorId })
      .from(feedbackRequests)
      .where(and(eq(feedbackRequests.id, id), isNull(feedbackRequests.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Request not found');
    }
    return rows[0];
  }

  private async assertActiveCategory(executor: Pick<Db, 'select'> | Tx, categoryId: string) {
    const rows = await executor
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.active, true)))
      .limit(1);
    if (!rows[0]) {
      throw new UnprocessableEntityException({
        message: 'Validation failed',
        details: [{ path: 'categoryId', message: 'Unknown or inactive category' }],
      });
    }
  }
}
