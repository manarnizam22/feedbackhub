import { Global, Module } from '@nestjs/common';

import { AuditService } from '../common/audit.service.js';
import { UsersController } from './controllers/users.controller.js';
import { UsersService } from './services/users.service.js';

/* Global because the auth guard (registered app-wide) depends on it. */
@Global()
@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditService],
  exports: [UsersService],
})
export class UsersModule {}
