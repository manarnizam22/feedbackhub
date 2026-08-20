import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { comments, feedbackRequests, users } from '@feedbackhub/db';
import { subject, type AppAbility } from '@feedbackhub/auth';
import type { Comment, PendingComment } from '@feedbackhub/types';

import { AuditService, type Tx } from '../../common/audit.service.js';
import { DB, type Db } from '../../common/db.module.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async create(
    userId: string,
    actorName: string,
    requestId: string,
    body: string,
  ): Promise<Comment> {
    const requiresApproval = await this.settings.getBooleanSetting(
      'comments_require_approval',
      false,
    );
    const outcome = await this.audit.transaction<{
      commentId: string;
      pushes: Array<{ userId: string; notification: import('@feedbackhub/types').Notification }>;
    }>(
      (result) => ({
        actorId: userId,
        action: 'comment.create',
        entityType: 'comment',
        entityId: result.commentId,
        data: { requestId },
      }),
      async (tx) => {
        const request = await tx
          .select({
            id: feedbackRequests.id,
            authorId: feedbackRequests.authorId,
            title: feedbackRequests.title,
          })
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
        const pushes: Array<{
          userId: string;
          notification: import('@feedbackhub/types').Notification;
        }> = [];
        const author = request[0].authorId;
        const wantsIt =
          author !== userId &&
          (await this.notifications.recipientAllowsCommentNotifications(tx, author));
        if (wantsIt) {
          const notification = await this.notifications.createInTx(tx, {
            recipientId: author,
            type: 'comment',
            actorName,
            requestId,
            requestTitle: request[0].title,
          });
          if (notification) {
            pushes.push({ userId: author, notification });
          }
        }
        if (requiresApproval) {
          const adminPushes = await this.notifications.createForAdminsInTx(tx, userId, {
            type: 'comment_pending',
            actorName,
            requestId,
            requestTitle: request[0].title,
          });
          pushes.push(...adminPushes);
        }
        return { commentId: inserted[0]!.id, pushes };
      },
    );
    for (const push of outcome.pushes) {
      this.notifications.pushAfterCommit(push.userId, push.notification);
    }
    return this.getById(outcome.commentId);
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

  async remove(userId: string, actorName: string, ability: AppAbility, id: string): Promise<void> {
    const outcome = await this.audit.transaction<{
      moderation: boolean;
      recipientId: string | null;
      notification: import('@feedbackhub/types').Notification | null;
    }>(
      (result) => ({
        actorId: userId,
        action: 'comment.delete',
        entityType: 'comment',
        entityId: id,
        data: { moderation: result.moderation },
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
        const moderation = row.authorId !== userId;
        if (moderation && !row.approved) {
          const context = await this.requestContext(tx, row.requestId);
          const notification = await this.notifications.createInTx(tx, {
            recipientId: row.authorId,
            type: 'comment_rejected',
            actorName,
            requestId: row.requestId,
            requestTitle: context.title,
          });
          return { moderation, recipientId: row.authorId, notification };
        }
        return { moderation, recipientId: null, notification: null };
      },
    );
    if (outcome.recipientId) {
      this.notifications.pushAfterCommit(outcome.recipientId, outcome.notification);
    }
  }

  async listPending(ability: AppAbility): Promise<PendingComment[]> {
    if (!ability.can('approve', 'Comment')) {
      throw new ForbiddenException('Admin role required');
    }
    const rows = await this.db
      .select({
        id: comments.id,
        requestId: comments.requestId,
        requestTitle: feedbackRequests.title,
        authorName: users.displayName,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(feedbackRequests, eq(comments.requestId, feedbackRequests.id))
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(comments.approved, false), isNull(comments.deletedAt)))
      .orderBy(asc(comments.createdAt));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  async approve(
    userId: string,
    actorName: string,
    ability: AppAbility,
    id: string,
  ): Promise<Comment> {
    if (!ability.can('approve', 'Comment')) {
      throw new ForbiddenException('Admin role required');
    }
    const outcome = await this.audit.transaction<{
      recipientId: string | null;
      notification: import('@feedbackhub/types').Notification | null;
    }>(
      { actorId: userId, action: 'comment.approve', entityType: 'comment', entityId: id },
      async (tx) => {
        const row = await this.getLiveRow(tx, id);
        await tx
          .update(comments)
          .set({ approved: true, updatedAt: new Date() })
          .where(eq(comments.id, id));
        if (row.authorId === userId) {
          return { recipientId: null, notification: null };
        }
        const context = await this.requestContext(tx, row.requestId);
        const notification = await this.notifications.createInTx(tx, {
          recipientId: row.authorId,
          type: 'comment_approved',
          actorName,
          requestId: row.requestId,
          requestTitle: context.title,
        });
        return { recipientId: row.authorId, notification };
      },
    );
    if (outcome.recipientId) {
      this.notifications.pushAfterCommit(outcome.recipientId, outcome.notification);
    }
    return this.getById(id);
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
      .select({
        id: comments.id,
        authorId: comments.authorId,
        requestId: comments.requestId,
        approved: comments.approved,
      })
      .from(comments)
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Comment not found');
    }
    return rows[0];
  }

  private async requestContext(executor: Pick<Db, 'select'> | Tx, requestId: string) {
    const rows = await executor
      .select({ title: feedbackRequests.title, authorId: feedbackRequests.authorId })
      .from(feedbackRequests)
      .where(eq(feedbackRequests.id, requestId))
      .limit(1);
    return rows[0]!;
  }
}
