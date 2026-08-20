import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ApiError } from './api-error';
import { env } from './env';

/* Companion to the backend's single exception filter: every problem-details
   response becomes a typed ApiError here, once — services stay plain HTTP
   calls, stores catch one error type. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(env.apiUrl)) {
    return next(req);
  }
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        typeof (error.error as { code?: unknown })?.code === 'string'
      ) {
        return throwError(() => new ApiError(error.error));
      }
      return throwError(() => error);
    }),
  );
};
