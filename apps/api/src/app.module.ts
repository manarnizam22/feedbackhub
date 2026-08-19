import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { DbModule } from './common/db.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { HealthController } from './health.controller.js';
import { SettingsModule } from './settings/settings.module.js';
import { TaxonomyModule } from './taxonomy/taxonomy.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [DbModule, UsersModule, TaxonomyModule, SettingsModule, FeedbackModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
