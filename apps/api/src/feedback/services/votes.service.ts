import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { feedbackRequests, votes } from '@feedbackhub/db';
import type { Notification } from '@feedbackhub/types';

import { AuditService, type Tx } from '../../common/audit.service.js';
import { type Db } from '../../common/db.module.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';

/* Vote endpoints act only on the caller's own (request, user) pair — the path
   defines ownership, so there is no foreign-vote route to authorize. Both
   operations are idempotent; a no-op repeat writes no audit entry. */
@Injectable()
export class VotesService {
  constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async cast(userId: string, requestId: string, actorName: string): Promise<void> {
    const outcome = await this.audit.transaction<{
      changed: boolean;
      recipientId: string | null;
      notification: Notification | null;
    }>(
      (result) =>
        result.changed
          ? { actorId: userId, action: 'vote.cast', entityType: 'request', entityId: requestId }
          : null,
      async (tx) => {
        const request = await this.assertLiveRequest(tx, requestId);
        const existing = await this.getVote(tx, requestId, userId);
        if (existing && !existing.deletedAt) {
          return { changed: false, recipientId: null, notification: null };
        }
        await tx
          .insert(votes)
          .values({ requestId, userId })
          .onConflictDoUpdate({
            target: [votes.requestId, votes.userId],
            set: { deletedAt: null, deletedBy: null },
          });
        const notification =
          request.authorId !== userId
            ? await this.notifications.createInTx(tx, {
                recipientId: request.authorId,
                type: 'vote',
                actorName,
                requestId,
                requestTitle: request.title,
              })
            : null;
        return { changed: true, recipientId: request.authorId, notification };
      },
    );
    if (outcome.recipientId) {
      this.notifications.pushAfterCommit(outcome.recipientId, outcome.notification);
    }
  }

  async withdraw(userId: string, requestId: string): Promise<void> {
    await this.audit.transaction<boolean>(
      (changed) =>
        changed
          ? {
              actorId: userId,
              action: 'vote.withdraw',
              entityType: 'request',
              entityId: requestId,
            }
          : null,
      async (tx) => {
        await this.assertLiveRequest(tx, requestId);
        const existing = await this.getVote(tx, requestId, userId);
        if (!existing || existing.deletedAt) {
          return false;
        }
        await tx
          .update(votes)
          .set({ deletedAt: new Date(), deletedBy: userId })
          .where(and(eq(votes.requestId, requestId), eq(votes.userId, userId)));
        return true;
      },
    );
  }

  private async assertLiveRequest(executor: Pick<Db, 'select'> | Tx, requestId: string) {
    const rows = await executor
      .select({
        id: feedbackRequests.id,
        authorId: feedbackRequests.authorId,
        title: feedbackRequests.title,
      })
      .from(feedbackRequests)
      .where(and(eq(feedbackRequests.id, requestId), isNull(feedbackRequests.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Request not found');
    }
    return rows[0];
  }

  private async getVote(executor: Pick<Db, 'select'> | Tx, requestId: string, userId: string) {
    const rows = await executor
      .select({ deletedAt: votes.deletedAt })
      .from(votes)
      .where(and(eq(votes.requestId, requestId), eq(votes.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }
}
