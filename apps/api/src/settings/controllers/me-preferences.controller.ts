import { Body, Controller, Inject, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreferencesSchema, type Preferences } from '@feedbackhub/types';

import { CurrentUser, type AuthenticatedUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { SettingsService } from '../services/settings.service.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me/preferences')
export class MePreferencesController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Put()
  @ApiOperation({ summary: 'Replace own preferences' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(PreferencesSchema)) body: Preferences,
  ) {
    return this.settings.updatePreferences(user.id, body);
  }
}
