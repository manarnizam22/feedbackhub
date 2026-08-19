import { Inject, Injectable } from '@nestjs/common';
import { auditLog, type Db } from '@feedbackhub/db';

import { DB } from './db.module.js';

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
    return this.db.transaction(async (tx) => {
      const result = await fn(tx);
      const resolved = typeof entry === 'function' ? entry(result) : entry;
      if (resolved) {
        await tx.insert(auditLog).values({
          actorId: resolved.actorId,
          action: resolved.action,
          entityType: resolved.entityType,
          entityId: resolved.entityId,
          data: resolved.data ?? null,
        });
      }
      return result;
    });
  }
}
