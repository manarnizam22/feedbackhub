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

  async getNumberSetting(key: string, fallback: number): Promise<number> {
    const value = await this.getValue(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  async getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
    const value = await this.getValue(key);
    return typeof value === 'boolean' ? value : fallback;
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
