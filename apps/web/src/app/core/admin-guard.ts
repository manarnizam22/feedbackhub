import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';

import { BootstrapStore } from './bootstrap-store';

/* UX only — every admin endpoint re-checks the role server-side. */
export const adminGuard: CanMatchFn = () => {
  const bootstrap = inject(BootstrapStore);
  return bootstrap.isAdmin() ? true : inject(Router).createUrlTree(['/requests']);
};
