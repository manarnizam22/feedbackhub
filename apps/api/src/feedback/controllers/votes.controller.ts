import { Controller, Delete, HttpCode, Inject, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, type AuthenticatedUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { VotesService } from '../services/votes.service.js';

const IdParam = new ZodValidationPipe(z.uuid());

@ApiTags('votes')
@ApiBearerAuth()
@Controller('requests/:id/vote')
export class VotesController {
  constructor(@Inject(VotesService) private readonly votes: VotesService) {}

  @Put()
  @HttpCode(204)
  @ApiOperation({ summary: 'Vote for a request (idempotent)' })
  cast(@CurrentUser() user: AuthenticatedUser, @Param('id', IdParam) id: string) {
    return this.votes.cast(user.id, id, user.displayName);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Withdraw vote (idempotent)' })
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id', IdParam) id: string) {
    return this.votes.withdraw(user.id, id);
  }
}
