import { Module } from '@nestjs/common';

import { TaxonomyService } from './taxonomy.service.js';

@Module({
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
