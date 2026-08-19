import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { BootstrapResponse } from '@feedbackhub/types';

import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
import { UsersService } from '../users/users.service.js';
import { SettingsService } from './settings.service.js';

/* One request, everything the SPA needs to start (ADR-0009): profile,
   resolved preferences, taxonomy, feature flags. No startup request chain. */
@ApiTags('bootstrap')
@ApiBearerAuth()
@Controller()
export class BootstrapController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(TaxonomyService) private readonly taxonomy: TaxonomyService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'Everything the SPA needs to start, in one response' })
  async bootstrap(@CurrentUser() user: AuthenticatedUser): Promise<BootstrapResponse> {
    const [row, preferences, taxonomy, featureFlags] = await Promise.all([
      this.users.getById(user.id),
      this.settings.getResolvedPreferences(user.id),
      this.taxonomy.getAll(),
      this.settings.getFeatureFlags(),
    ]);
    if (!row) {
      throw new NotFoundException('User not found');
    }
    return {
      profile: {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        isAdmin: user.isAdmin,
      },
      preferences,
      taxonomy,
      featureFlags,
    };
  }
}
