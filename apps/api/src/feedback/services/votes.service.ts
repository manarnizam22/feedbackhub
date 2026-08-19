import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { feedbackRequests, votes } from '@feedbackhub/db';

import { AuditService, type Tx } from '../../common/audit.service.js';
import { type Db } from '../../common/db.module.js';

/* Vote endpoints act only on the caller's own (request, user) pair — the path
   defines ownership, so there is no foreign-vote route to authorize. Both
   operations are idempotent; a no-op repeat writes no audit entry. */
@Injectable()
export class VotesService {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  async cast(userId: string, requestId: string): Promise<void> {
    await this.audit.transaction<boolean>(
      (changed) =>
        changed
          ? { actorId: userId, action: 'vote.cast', entityType: 'request', entityId: requestId }
          : null,
      async (tx) => {
        await this.assertLiveRequest(tx, requestId);
        const existing = await this.getVote(tx, requestId, userId);
        if (existing && !existing.deletedAt) {
          return false;
        }
        await tx
          .insert(votes)
          .values({ requestId, userId })
          .onConflictDoUpdate({
            target: [votes.requestId, votes.userId],
            set: { deletedAt: null, deletedBy: null },
          });
        return true;
      },
    );
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
      .select({ id: feedbackRequests.id })
      .from(feedbackRequests)
      .where(and(eq(feedbackRequests.id, requestId), isNull(feedbackRequests.deletedAt)))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException('Request not found');
    }
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
