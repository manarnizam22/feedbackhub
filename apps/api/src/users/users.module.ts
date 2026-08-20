import { Global, Module } from '@nestjs/common';

import { AuditService } from '../common/audit.service.js';
import { UsersController } from './controllers/users.controller.js';
import { RegistrationPolicyService } from './services/registration-policy.service.js';
import { UsersService } from './services/users.service.js';

/* Global because the auth guard (registered app-wide) depends on it. */
@Global()
@Module({
  controllers: [UsersController],
  providers: [UsersService, RegistrationPolicyService, AuditService],
  exports: [UsersService, RegistrationPolicyService],
})
export class UsersModule {}
