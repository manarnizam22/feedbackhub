import { Global, Module } from '@nestjs/common';

import { EventsController } from './controllers/events.controller.js';
import { NotificationsController } from './controllers/notifications.controller.js';
import { NotificationsService } from './services/notifications.service.js';

/* Global: the feedback domain's mutation services write notification rows
   inside their transactions. */
@Global()
@Module({
  controllers: [NotificationsController, EventsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
