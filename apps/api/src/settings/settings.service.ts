import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { appSettings, userPreferences } from '@feedbackhub/db';
import { FeatureFlagsSchema, type FeatureFlags, type Preferences } from '@feedbackhub/types';

import { DB, type Db } from '../common/db.module.js';
import { resolvePreferences } from './resolve-preferences.js';

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

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
}
