import { Injectable } from '@nestjs/common';
import { auditLog, type Db } from '@feedbackhub/db';

type Executor = Pick<Db, 'insert'>;

interface AuditEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  data?: unknown;
}

/* Writes the audit row inside the caller's transaction (ADR-0007) — the
   mutation and its trail commit or roll back together. */
@Injectable()
export class AuditService {
  async write(executor: Executor, entry: AuditEntry) {
    await executor.insert(auditLog).values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      data: entry.data ?? null,
    });
  }
}
