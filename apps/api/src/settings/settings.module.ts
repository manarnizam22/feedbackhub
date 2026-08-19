import { Module } from '@nestjs/common';

import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { BootstrapController } from './bootstrap.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [TaxonomyModule],
  controllers: [BootstrapController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
