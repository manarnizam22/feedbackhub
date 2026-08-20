import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { env } from './env';
import { keycloak } from './keycloak';

/* Attaches a fresh bearer token to API calls only. A failed refresh or a 401
   from the API (terminated session, revoked account) sends the user back to
   login — the API's word is final, the SPA never argues with it. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(env.apiUrl)) {
    return next(req);
  }
  return from(
    keycloak.updateToken(30).catch(() => {
      void keycloak.login();
    }),
  ).pipe(
    switchMap(() =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${keycloak.token ?? ''}` } })),
    ),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void keycloak.login();
      }
      return throwError(() => error);
    }),
  );
};
