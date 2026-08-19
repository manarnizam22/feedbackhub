import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '@feedbackhub/db';

import { DB, type Db } from '../common/db.module.js';

interface ShadowUser {
  id: string;
  email: string;
  displayName: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /* Upsert from the verified token on every authenticated request. Display
     name is written on first insert only — after that it belongs to the user's
     profile settings, not to the IdP. Logging in reactivates a soft-deleted
     account (deliberate: deletion is deactivation, ADR-0007). */
  async ensureShadow(user: ShadowUser) {
    await this.db
      .insert(users)
      .values({ id: user.id, email: user.email, displayName: user.displayName })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: user.email, deletedAt: null, deletedBy: null, updatedAt: new Date() },
      });
  }

  async getById(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
