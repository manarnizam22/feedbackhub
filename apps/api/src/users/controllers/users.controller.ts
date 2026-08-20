import { Body, Controller, Delete, HttpCode, Inject, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateProfileSchema, type UpdateProfile } from '@feedbackhub/types';

import { CurrentUser, type AuthenticatedUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { UsersService } from '../services/users.service.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update own display name' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfile,
  ) {
    return this.users.updateProfile(user.id, body.displayName);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete own account (deactivation — sign-in reactivates)' })
  deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.users.deleteAccount(user.id);
  }
}
