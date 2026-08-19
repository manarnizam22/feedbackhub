import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from './auth/public.decorator.js';

@ApiTags('health')
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
