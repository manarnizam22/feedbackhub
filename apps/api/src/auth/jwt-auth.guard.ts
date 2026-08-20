import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defineAbilityFor } from '@feedbackhub/auth';

import { RegistrationPolicyService } from '../users/services/registration-policy.service.js';
import { UsersService } from '../users/services/users.service.js';
import type { AuthenticatedRequest } from './current-user.decorator.js';
import { IS_PUBLIC } from './public.decorator.js';
import { verifyAccessToken } from './verify-token.js';

/* The single authentication point (docs/rules/security.md): verifies the
   Keycloak-issued JWT via the shared verify path, then attaches the caller and
   their CASL ability to the request and guarantees the shadow user row exists.
   Routes marked @Public() skip it. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(RegistrationPolicyService) private readonly registration: RegistrationPolicyService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const user = await verifyAccessToken(token);
    if (!user) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }

    await this.registration.assertAdmitted(user);
    await this.users.ensureShadow(user);

    req.user = user;
    req.ability = defineAbilityFor(user);
    return true;
  }
}
