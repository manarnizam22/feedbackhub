import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AppAbility } from '@feedbackhub/auth';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthenticatedUser;
  ability: AppAbility;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const CurrentAbility = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppAbility =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().ability,
);
