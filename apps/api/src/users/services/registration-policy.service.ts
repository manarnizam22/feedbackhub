import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { appSettings, users } from '@feedbackhub/db';

import { DB, type Db } from '../../common/db.module.js';
import type { AuthenticatedUser } from '../../auth/current-user.decorator.js';

interface RegistrationPolicy {
  mode: 'open' | 'invite-only' | 'domain-restricted';
  allowedDomains: string[];
}

const OPEN: RegistrationPolicy = { mode: 'open', allowedDomains: [] };

/* The admin registration policy, enforced at the application gate. Keycloak
   keeps authenticating anyone it knows (the app deliberately holds no IdP
   admin credentials — ADR-0002's read-only integration), but this service
   decides who is ADMITTED: domain-restricted rejects foreign email domains,
   invite-only admits only users whose shadow row already exists (i.e. someone
   who was in before the door closed, or was provisioned by an admin). Admins
   always pass — the policy cannot lock out its own operators. */
@Injectable()
export class RegistrationPolicyService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async assertAdmitted(user: AuthenticatedUser): Promise<void> {
    if (user.isAdmin) {
      return;
    }
    const policy = await this.currentPolicy();
    if (policy.mode === 'open') {
      return;
    }
    if (policy.mode === 'domain-restricted') {
      const domain = user.email.split('@')[1]?.toLowerCase() ?? '';
      const allowed = policy.allowedDomains.map((entry) => entry.trim().toLowerCase());
      if (!allowed.includes(domain)) {
        throw new ForbiddenException(
          `Registration is restricted to: ${allowed.join(', ') || 'no domains (contact an admin)'}`,
        );
      }
      return;
    }
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);
    if (!existing[0]) {
      throw new ForbiddenException('Registration is invite-only — ask an admin for access');
    }
  }

  private async currentPolicy(): Promise<RegistrationPolicy> {
    const rows = await this.db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, 'registration_policy'))
      .limit(1);
    const value = rows[0]?.value as Partial<RegistrationPolicy> | undefined;
    if (!value || typeof value.mode !== 'string') {
      return OPEN;
    }
    return {
      mode: value.mode as RegistrationPolicy['mode'],
      allowedDomains: Array.isArray(value.allowedDomains) ? value.allowedDomains : [],
    };
  }
}
