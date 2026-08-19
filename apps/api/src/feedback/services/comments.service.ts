import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { comments, feedbackRequests, users } from '@feedbackhub/db';
import { subject, type AppAbility } from '@feedbackhub/auth';
import type { Comment } from '@feedbackhub/types';

import { AuditService, type Tx } from '../../common/audit.service.js';
import { DB, type Db } from '../../common/db.module.js';
import { SettingsService } from '../../settings/settings.service.js';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(userId: string, requestId: string, body: string): Promise<Comment> {
    const requiresApproval = await this.settings.getBooleanSetting(
      'comments_require_approval',
      false,
    );
    const id = await this.audit.transaction<string>(
      (commentId) => ({
        actorId: userId,
        action: 'comment.create',
        entityType: 'comment',
        entityId: commentId,
        data: { requestId },
      }),
      async (tx) => {
        const request = await tx
          .select({ id: feedbackRequests.id })
          .from(feedbackRequests)
          .where(and(eq(feedbackRequests.id, requestId), isNull(feedbackRequests.deletedAt)))
          .limit(1);
        if (!request[0]) {
          throw new NotFoundException('Request not found');
        }
        const inserted = await tx
          .insert(comments)
          .values({ requestId, authorId: userId, body, approved: !requiresApproval })
          .returning({ id: comments.id });
        return inserted[0]!.id;
      },
    );
    return this.getById(id);
  }

  async update(userId: string, ability: AppAbility, id: string, body: string): Promise<Comment> {
    await this.audit.transaction(
      { actorId: userId, action: 'comment.update', entityType: 'comment', entityId: id },
      async (tx) => {
        const row = await this.getLiveRow(tx, id);
        if (!ability.can('update', subject('Comment', { authorId: row.authorId }))) {
          throw new NotFoundException('Comment not found');
        }
        await tx.update(comments).set({ body, updatedAt: new Date() }).where(eq(comments.id, id));
      },
    );
    return this.getById(id);
  }

  async remove(userId: string, ability: AppAbility, id: string): Promise<void> {
    await this.audit.transaction<boolean>(
      (moderation) => ({
        actorId: userId,
        action: 'comment.delete',
        entityType: 'comment',
        entityId: id,
        data: { moderation },
      }),
      async (tx) => {
        const row = await this.getLiveRow(tx, id);
        if (!ability.can('delete', subject('Comment', { authorId: row.authorId }))) {
          throw new NotFoundException('Comment not found');
        }
        await tx
          .update(comments)
          .set({ deletedAt: new Date(), deletedBy: userId })
          .where(eq(comments.id, id));
        return row.authorId !== userId;
      },
    );
  }

  private async getById(id: string): Promise<Comment> {
    const rows = await this.db
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
      .where(eq(comments.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Comment not found');
    }
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getLiveRow(executor: Pick<Db, 'select'> | Tx, id: string) {
    const rows = await executor
      .select({ id: comments.id, authorId: comments.authorId })
      .from(comments)
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Comment not found');
    }
    return rows[0];
  }
}
