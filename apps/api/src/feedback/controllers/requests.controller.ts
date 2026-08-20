import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CreateRequestSchema,
  ListRequestsQuerySchema,
  SetStatusSchema,
  UpdateRequestSchema,
  type CreateRequest,
  type ListRequestsQuery,
  type SetStatus,
  type UpdateRequest,
} from '@feedbackhub/types';
import type { AppAbility } from '@feedbackhub/auth';

import {
  CurrentAbility,
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { RequestsService } from '../services/requests.service.js';

const IdParam = new ZodValidationPipe(z.uuid());

@ApiTags('requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List requests: filter, search, sort, paginate; pinned first' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(ListRequestsQuerySchema)) query: ListRequestsQuery,
  ) {
    return this.requests.list(user.id, query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a request (rate-limited per day)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRequestSchema)) body: CreateRequest,
  ) {
    return this.requests.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Request detail with discussion' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', IdParam) id: string) {
    return this.requests.detail(user.id, id, user.isAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit own request' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(UpdateRequestSchema)) body: UpdateRequest,
  ) {
    return this.requests.update(user.id, ability, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete own request (soft)' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
  ) {
    return this.requests.remove(user.id, ability, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Set status (admin)' })
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(SetStatusSchema)) body: SetStatus,
  ) {
    return this.requests.setStatus(user.id, ability, id, body.statusId);
  }

  @Put(':id/pin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Pin to top of list (admin)' })
  pin(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
  ) {
    return this.requests.setPinned(user.id, ability, id, true);
  }

  @Delete(':id/pin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unpin (admin)' })
  unpin(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAbility() ability: AppAbility,
    @Param('id', IdParam) id: string,
  ) {
    return this.requests.setPinned(user.id, ability, id, false);
  }
}
