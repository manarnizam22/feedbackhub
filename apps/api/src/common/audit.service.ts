import { Inject, Injectable } from '@nestjs/common';
import { auditLog, type Db } from '@feedbackhub/db';

import { DB } from './db.module.js';
import { eventBus } from './event-bus.js';

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface AuditEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  data?: unknown;
}

/* The single mutation path (ADR-0007): every mutating service call runs through
   transaction(), which commits the change and its audit row together — a failed
   mutation leaves no trail, a successful one always does. The entry may be
   derived from the transaction's result (ids created inside, moderation flags);
   returning null from the derive function skips auditing (idempotent no-ops). */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async transaction<T>(
    entry: AuditEntry | ((result: T) => AuditEntry | null),
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    let committed: AuditEntry | null = null;
    const result = await this.db.transaction(async (tx) => {
      const value = await fn(tx);
      const resolved = typeof entry === 'function' ? entry(value) : entry;
      if (resolved) {
        await tx.insert(auditLog).values({
          actorId: resolved.actorId,
          action: resolved.action,
          entityType: resolved.entityType,
          entityId: resolved.entityId,
          data: resolved.data ?? null,
        });
        committed = resolved;
      }
      return value;
    });
    if (committed) {
      const entryValue = committed as AuditEntry;
      eventBus.emitChange({
        kind: 'change',
        action: entryValue.action,
        entityType: entryValue.entityType,
        entityId: entryValue.entityId,
        actorId: entryValue.actorId,
      });
    }
    return result;
  }
}
