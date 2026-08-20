import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { BootstrapStore } from '@core/bootstrap-store';
import { logout } from '@core/keycloak';
import { FhButton } from '@ui/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CdkMenu, CdkMenuItem, CdkMenuTrigger, FhButton],
  templateUrl: './app.html',
})
export class App {
  readonly store = inject(BootstrapStore);
  readonly logout = logout;
}
