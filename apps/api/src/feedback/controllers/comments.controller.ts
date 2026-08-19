import { Body, Controller, Delete, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateCommentSchema, UpdateCommentSchema, type CreateComment } from '@feedbackhub/types';
import type { AppAbility } from '@feedbackhub/auth';

import {
  CurrentAbility,
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CommentsService } from '../services/comments.service.js';

const IdParam = new ZodValidationPipe(z.uuid());

@ApiTags('comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(@Inject(CommentsService) private readonly comments: CommentsService) {}

  @Post('requests/:id/comments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Comment on a request' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', IdParam) requestId: string,
    @Body(new ZodValidationPipe(CreateCommentSchema)) body: CreateComment,
  ) {
    return this.comments.create(user.id, requestId, body.body);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Edit own comment' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(UpdateCommentSchema)) body: CreateComment,
  ) {
    return this.comments.update(user.id, ability, id, body.body);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete comment (author, or admin as moderation)' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
  ) {
    return this.comments.remove(user.id, ability, id);
  }
}
