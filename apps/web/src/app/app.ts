import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BootstrapStore } from '@core/bootstrap-store';
import { logout } from '@core/keycloak';
import { relativeTime } from '@core/format';
import { NotificationsStore } from '@notifications/data/notifications-store';
import { notificationLabel } from '@notifications/data/notification-label';
import { FhButton } from '@ui/button';
import { FhIcon } from '@ui/icons';
import { FhToasts } from '@ui/toast';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    FhButton,
    FhIcon,
    FhToasts,
  ],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(BootstrapStore);
  readonly notifications = inject(NotificationsStore);
  readonly logout = logout;
  readonly relativeTime = relativeTime;

  readonly labelFor = notificationLabel;
}
