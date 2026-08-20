import { Module } from '@nestjs/common';

import { AuditService } from '../common/audit.service.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { AdminSettingsController } from './controllers/admin-settings.controller.js';
import { BootstrapController } from './controllers/bootstrap.controller.js';
import { MePreferencesController } from './controllers/me-preferences.controller.js';
import { SettingsService } from './services/settings.service.js';

@Module({
  imports: [TaxonomyModule],
  controllers: [BootstrapController, MePreferencesController, AdminSettingsController],
  providers: [SettingsService, AuditService],
  exports: [SettingsService],
})
export class SettingsModule {}
