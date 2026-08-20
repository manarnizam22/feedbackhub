import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, ne } from 'drizzle-orm';
import { categories, statuses } from '@feedbackhub/db';
import type { Category, Status, UpsertCategory, UpsertStatus } from '@feedbackhub/types';

import { AuditService } from '../../common/audit.service.js';
import { DB, type Db } from '../../common/db.module.js';

/* Returns the full taxonomy including inactive entries — the frontend needs
   retired names to render existing requests; pickers filter on `active`. */
@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getAll(): Promise<{ categories: Category[]; statuses: Status[] }> {
    const [categoryRows, statusRows] = await Promise.all([
      this.db.select().from(categories).orderBy(asc(categories.position)),
      this.db.select().from(statuses).orderBy(asc(statuses.position)),
    ]);
    return {
      categories: categoryRows.map((row) => ({
        id: row.id,
        name: row.name,
        active: row.active,
        position: row.position,
      })),
      statuses: statusRows.map((row) => ({
        id: row.id,
        name: row.name,
        position: row.position,
        isDefault: row.isDefault,
        active: row.active,
      })),
    };
  }

  async createCategory(actorId: string, input: UpsertCategory): Promise<Category> {
    const id = await this.audit.transaction<string>(
      (categoryId) => ({
        actorId,
        action: 'category.create',
        entityType: 'category',
        entityId: categoryId,
        data: input,
      }),
      async (tx) => {
        const inserted = await tx
          .insert(categories)
          .values(input)
          .onConflictDoNothing({ target: categories.name })
          .returning({ id: categories.id });
        if (!inserted[0]) {
          throw new ConflictException('A category with this name already exists');
        }
        return inserted[0].id;
      },
    );
    return this.getCategory(id);
  }

  async updateCategory(
    actorId: string,
    id: string,
    input: Partial<UpsertCategory>,
  ): Promise<Category> {
    await this.audit.transaction(
      { actorId, action: 'category.update', entityType: 'category', entityId: id, data: input },
      async (tx) => {
        const updated = await tx
          .update(categories)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(categories.id, id))
          .returning({ id: categories.id });
        if (!updated[0]) {
          throw new NotFoundException('Category not found');
        }
      },
    );
    return this.getCategory(id);
  }

  async createStatus(actorId: string, input: UpsertStatus): Promise<Status> {
    const id = await this.audit.transaction<string>(
      (statusId) => ({
        actorId,
        action: 'status.create',
        entityType: 'status',
        entityId: statusId,
        data: input,
      }),
      async (tx) => {
        if (input.isDefault) {
          await tx.update(statuses).set({ isDefault: false }).where(eq(statuses.isDefault, true));
        }
        const inserted = await tx
          .insert(statuses)
          .values(input)
          .onConflictDoNothing({ target: statuses.name })
          .returning({ id: statuses.id });
        if (!inserted[0]) {
          throw new ConflictException('A status with this name already exists');
        }
        return inserted[0].id;
      },
    );
    return this.getStatus(id);
  }

  async updateStatus(actorId: string, id: string, input: Partial<UpsertStatus>): Promise<Status> {
    await this.audit.transaction(
      { actorId, action: 'status.update', entityType: 'status', entityId: id, data: input },
      async (tx) => {
        if (input.isDefault) {
          await tx.update(statuses).set({ isDefault: false }).where(ne(statuses.id, id));
        }
        const updated = await tx
          .update(statuses)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(statuses.id, id))
          .returning({ id: statuses.id });
        if (!updated[0]) {
          throw new NotFoundException('Status not found');
        }
      },
    );
    return this.getStatus(id);
  }

  private async getCategory(id: string): Promise<Category> {
    const rows = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    const row = rows[0]!;
    return { id: row.id, name: row.name, active: row.active, position: row.position };
  }

  private async getStatus(id: string): Promise<Status> {
    const rows = await this.db.select().from(statuses).where(eq(statuses.id, id)).limit(1);
    const row = rows[0]!;
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      isDefault: row.isDefault,
      active: row.active,
    };
  }
}
