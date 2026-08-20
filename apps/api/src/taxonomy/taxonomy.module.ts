import { Module } from '@nestjs/common';

import { AuditService } from '../common/audit.service.js';
import { TaxonomyController } from './controllers/taxonomy.controller.js';
import { TaxonomyService } from './services/taxonomy.service.js';

@Module({
  controllers: [TaxonomyController],
  providers: [TaxonomyService, AuditService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
