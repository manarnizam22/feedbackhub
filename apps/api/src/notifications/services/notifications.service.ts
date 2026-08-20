import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { notifications, userPreferences, users, type Db } from '@feedbackhub/db';
import type { Notification, NotificationsResponse } from '@feedbackhub/types';

import { eventBus } from '../../common/event-bus.js';
import { DB } from '../../common/db.module.js';
import type { Tx } from '../../common/audit.service.js';

interface NotifyInput {
  recipientId: string;
  type: Notification['type'];
  actorName: string;
  requestId: string;
  requestTitle: string;
  detail?: string;
}

/* Rows are written inside the caller's mutation transaction (they commit or
   roll back together); pushAfterCommit() is called by the mutation service
   AFTER its audited transaction resolves — the bell can never announce a
   rolled-back action. */
@Injectable()
export class NotificationsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async createInTx(tx: Tx, input: NotifyInput): Promise<Notification | null> {
    if (!input.recipientId) {
      return null;
    }
    const inserted = await tx
      .insert(notifications)
      .values({
        userId: input.recipientId,
        type: input.type,
        actorName: input.actorName,
        requestId: input.requestId,
        requestTitle: input.requestTitle,
        detail: input.detail ?? null,
      })
      .returning();
    const row = inserted[0]!;
    return {
      id: row.id,
      type: row.type as Notification['type'],
      actorName: row.actorName,
      requestId: row.requestId,
      requestTitle: row.requestTitle,
      detail: row.detail,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createForAdminsInTx(
    tx: Tx,
    exceptUserId: string,
    input: Omit<NotifyInput, 'recipientId'>,
  ): Promise<Array<{ userId: string; notification: Notification }>> {
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isAdmin, true), ne(users.id, exceptUserId), isNull(users.deletedAt)));
    const created: Array<{ userId: string; notification: Notification }> = [];
    for (const admin of admins) {
      const notification = await this.createInTx(tx, { ...input, recipientId: admin.id });
      if (notification) {
        created.push({ userId: admin.id, notification });
      }
    }
    return created;
  }

  async createForAllUsersInTx(
    tx: Tx,
    exceptUserId: string,
    input: Omit<NotifyInput, 'recipientId'>,
  ): Promise<Array<{ userId: string; notification: Notification }>> {
    const recipients = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(ne(users.id, exceptUserId), isNull(users.deletedAt)));
    const created: Array<{ userId: string; notification: Notification }> = [];
    for (const recipient of recipients) {
      const notification = await this.createInTx(tx, { ...input, recipientId: recipient.id });
      if (notification) {
        created.push({ userId: recipient.id, notification });
      }
    }
    return created;
  }

  pushAfterCommit(userId: string, notification: Notification | null): void {
    if (notification) {
      eventBus.emitNotification(userId, notification);
    }
  }

  async recipientAllowsCommentNotifications(tx: Tx, userId: string): Promise<boolean> {
    const rows = await tx
      .select({ notifyOnComment: userPreferences.notifyOnComment })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return rows[0]?.notifyOnComment ?? true;
  }

  async list(userId: string): Promise<NotificationsResponse> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
    const unreadRows = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type as Notification['type'],
        actorName: row.actorName,
        requestId: row.requestId,
        requestTitle: row.requestTitle,
        detail: row.detail,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      })),
      unread: unreadRows.length,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }
}
