import { Injectable, type PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodType } from 'zod';

/* Parses body/query/params through the shared zod contract; failures become a
   422 problem with per-field details the frontend attaches to inputs. */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new UnprocessableEntityException({
        message: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
