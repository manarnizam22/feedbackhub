import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { appSettings, userPreferences } from '@feedbackhub/db';
import { FeatureFlagsSchema, type FeatureFlags, type Preferences } from '@feedbackhub/types';

import type { AdminSettings } from '@feedbackhub/types';

import { AuditService } from '../../common/audit.service.js';
import { DB, type Db } from '../../common/db.module.js';
import { resolvePreferences } from './resolve-preferences.js';

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  registrationPolicy: { mode: 'open', allowedDomains: [] },
  commentsRequireApproval: false,
  submissionsPerUserPerDay: 10,
  featureFlags: {},
};

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getFeatureFlags(): Promise<FeatureFlags> {
    const rows = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'feature_flags'))
      .limit(1);
    const parsed = FeatureFlagsSchema.safeParse(rows[0]?.value);
    return parsed.success ? parsed.data : {};
  }

  async getResolvedPreferences(userId: string): Promise<Preferences> {
    const rows = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return resolvePreferences(rows[0] ?? null);
  }

  async updatePreferences(userId: string, prefs: Preferences): Promise<Preferences> {
    await this.audit.transaction(
      {
        actorId: userId,
        action: 'user.update_preferences',
        entityType: 'user',
        entityId: userId,
      },
      async (tx) => {
        await tx
          .insert(userPreferences)
          .values({ userId, ...prefs })
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: { ...prefs, updatedAt: new Date() },
          });
      },
    );
    return this.getResolvedPreferences(userId);
  }

  async getNumberSetting(key: string, fallback: number): Promise<number> {
    const value = await this.getValue(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  async getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
    const value = await this.getValue(key);
    return typeof value === 'boolean' ? value : fallback;
  }

  async getAdminSettings(): Promise<AdminSettings> {
    const rows = await this.db.select().from(appSettings);
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const stored = {
      registrationPolicy: byKey.get('registration_policy'),
      commentsRequireApproval: byKey.get('comments_require_approval'),
      submissionsPerUserPerDay: byKey.get('submissions_per_user_per_day'),
      featureFlags: byKey.get('feature_flags'),
    };
    return {
      registrationPolicy:
        (stored.registrationPolicy as AdminSettings['registrationPolicy']) ??
        DEFAULT_ADMIN_SETTINGS.registrationPolicy,
      commentsRequireApproval:
        typeof stored.commentsRequireApproval === 'boolean'
          ? stored.commentsRequireApproval
          : DEFAULT_ADMIN_SETTINGS.commentsRequireApproval,
      submissionsPerUserPerDay:
        typeof stored.submissionsPerUserPerDay === 'number'
          ? stored.submissionsPerUserPerDay
          : DEFAULT_ADMIN_SETTINGS.submissionsPerUserPerDay,
      featureFlags:
        (stored.featureFlags as AdminSettings['featureFlags']) ??
        DEFAULT_ADMIN_SETTINGS.featureFlags,
    };
  }

  async updateAdminSettings(actorId: string, settings: AdminSettings): Promise<AdminSettings> {
    await this.audit.transaction(
      {
        actorId,
        action: 'settings.update',
        entityType: 'app_settings',
        entityId: 'app_settings',
        data: settings,
      },
      async (tx) => {
        const entries: Array<[string, unknown]> = [
          ['registration_policy', settings.registrationPolicy],
          ['comments_require_approval', settings.commentsRequireApproval],
          ['submissions_per_user_per_day', settings.submissionsPerUserPerDay],
          ['feature_flags', settings.featureFlags],
        ];
        for (const [key, value] of entries) {
          await tx
            .insert(appSettings)
            .values({ key, value })
            .onConflictDoUpdate({
              target: appSettings.key,
              set: { value, updatedAt: new Date() },
            });
        }
      },
    );
    return this.getAdminSettings();
  }

  private async getValue(key: string): Promise<unknown> {
    const rows = await this.db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    return rows[0]?.value;
  }
}
