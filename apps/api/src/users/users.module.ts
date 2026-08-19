import { Global, Module } from '@nestjs/common';

import { UsersService } from './users.service.js';

/* Global because the auth guard (registered app-wide) depends on it. */
@Global()
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
