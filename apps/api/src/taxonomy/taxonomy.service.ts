import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { categories, statuses } from '@feedbackhub/db';
import type { Category, Status } from '@feedbackhub/types';

import { DB, type Db } from '../common/db.module.js';

/* Returns the full taxonomy including inactive entries — the frontend needs
   retired names to render existing requests; pickers filter on `active`. */
@Injectable()
export class TaxonomyService {
  constructor(@Inject(DB) private readonly db: Db) {}

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
}
