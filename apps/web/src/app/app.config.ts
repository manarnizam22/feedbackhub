import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { apiErrorInterceptor } from '@core/api-error-interceptor';
import { authInterceptor } from '@core/auth-interceptor';
import { BootstrapStore } from '@core/bootstrap-store';
import { initKeycloak } from '@core/keycloak';
import { live } from '@core/live';
import { NotificationsStore } from '@notifications/data/notifications-store';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideAppInitializer(async () => {
      const bootstrap = inject(BootstrapStore);
      const notifications = inject(NotificationsStore);
      await initKeycloak();
      await bootstrap.load();
      live.start();
      await notifications.load();
    }),
  ],
};
