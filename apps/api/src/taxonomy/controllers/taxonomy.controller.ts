import { Body, Controller, ForbiddenException, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  UpsertCategorySchema,
  UpsertStatusSchema,
  type UpsertCategory,
  type UpsertStatus,
} from '@feedbackhub/types';
import type { AppAbility } from '@feedbackhub/auth';

import {
  CurrentAbility,
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { TaxonomyService } from '../services/taxonomy.service.js';

const IdParam = new ZodValidationPipe(z.uuid());

/* Guard once at class level: everything under /admin/(categories|statuses) is
   the manage ability; per-route checks would only repeat it. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class TaxonomyController {
  constructor(@Inject(TaxonomyService) private readonly taxonomy: TaxonomyService) {}

  private assertManage(ability: AppAbility, subjectName: 'Category' | 'Status') {
    if (!ability.can('manage', subjectName)) {
      throw new ForbiddenException('Admin role required');
    }
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category (admin)' })
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Body(new ZodValidationPipe(UpsertCategorySchema)) body: UpsertCategory,
  ) {
    this.assertManage(ability, 'Category');
    return this.taxonomy.createCategory(user.id, body);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update / retire category (admin)' })
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(UpsertCategorySchema.partial())) body: Partial<UpsertCategory>,
  ) {
    this.assertManage(ability, 'Category');
    return this.taxonomy.updateCategory(user.id, id, body);
  }

  @Post('statuses')
  @ApiOperation({ summary: 'Create status (admin)' })
  createStatus(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Body(new ZodValidationPipe(UpsertStatusSchema)) body: UpsertStatus,
  ) {
    this.assertManage(ability, 'Status');
    return this.taxonomy.createStatus(user.id, body);
  }

  @Patch('statuses/:id')
  @ApiOperation({ summary: 'Update status incl. default flag (admin)' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(UpsertStatusSchema.partial())) body: Partial<UpsertStatus>,
  ) {
    this.assertManage(ability, 'Status');
    return this.taxonomy.updateStatus(user.id, id, body);
  }
}
