import { Module } from '@nestjs/common';

import { AuditService } from '../common/audit.service.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CommentsController } from './controllers/comments.controller.js';
import { CommentsService } from './services/comments.service.js';
import { RequestsController } from './controllers/requests.controller.js';
import { RequestsService } from './services/requests.service.js';
import { VotesController } from './controllers/votes.controller.js';
import { VotesService } from './services/votes.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [RequestsController, VotesController, CommentsController],
  providers: [RequestsService, VotesService, CommentsService, AuditService],
})
export class FeedbackModule {}
