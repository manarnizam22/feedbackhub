import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defineAbilityFor } from '@feedbackhub/auth';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { config } from '../config.js';
import { UsersService } from '../users/services/users.service.js';
import type { AuthenticatedRequest } from './current-user.decorator.js';
import { IS_PUBLIC } from './public.decorator.js';

type KeycloakPayload = JWTPayload & {
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
};

/* The single authentication point (docs/rules/security.md): verifies the
   Keycloak-issued JWT against the realm's JWKS — signature, issuer, audience,
   expiry — then attaches the caller and their CASL ability to the request and
   guarantees the shadow user row exists. Routes marked @Public() skip it. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks = createRemoteJWKSet(
    new URL(`${config.keycloak.issuer}/protocol/openid-connect/certs`),
  );

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(UsersService) private readonly users: UsersService,
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
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: KeycloakPayload;
    try {
      const verified = await jwtVerify(token, this.jwks, {
        issuer: config.keycloak.issuer,
        audience: config.keycloak.audience,
      });
      payload = verified.payload as KeycloakPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token missing required claims');
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.name ?? payload.preferred_username ?? payload.email,
      isAdmin: payload.realm_access?.roles?.includes('admin') ?? false,
    };

    await this.users.ensureShadow(user);

    req.user = user;
    req.ability = defineAbilityFor(user);
    return true;
  }
}
