import { Body, Controller, ForbiddenException, Get, Inject, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminSettingsSchema, type AdminSettings } from '@feedbackhub/types';
import type { AppAbility } from '@feedbackhub/auth';

import {
  CurrentAbility,
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  private assertManage(ability: AppAbility) {
    if (!ability.can('manage', 'AppSettings')) {
      throw new ForbiddenException('Admin role required');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Read application settings (admin)' })
  get(@CurrentAbility() ability: AppAbility) {
    this.assertManage(ability);
    return this.settings.getAdminSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Replace application settings (admin)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Body(new ZodValidationPipe(AdminSettingsSchema)) body: AdminSettings,
  ) {
    this.assertManage(ability);
    return this.settings.updateAdminSettings(user.id, body);
  }
}
