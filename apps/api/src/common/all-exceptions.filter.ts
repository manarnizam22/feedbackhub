import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Problem } from '@feedbackhub/types';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_failed',
  429: 'rate_limited',
};

/* Every error leaving the API is a problem-details JSON (docs/rules/api-patterns.md).
   Expected failures map by status; anything else logs with full detail and
   returns an opaque 500. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message?.toString() ??
            exception.message);
      const details =
        typeof response === 'object' && response !== null
          ? (response as { details?: Problem['details'] }).details
          : undefined;
      const problem: Problem = {
        status,
        code: CODE_BY_STATUS[status] ?? 'error',
        message,
        ...(details ? { details } : {}),
      };
      void reply.status(status).send(problem);
      return;
    }

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    const problem: Problem = { status: 500, code: 'internal', message: 'Something went wrong' };
    void reply.status(500).send(problem);
  }
}
