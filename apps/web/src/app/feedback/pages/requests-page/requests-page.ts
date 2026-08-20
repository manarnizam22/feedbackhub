import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BootstrapStore } from '@core/bootstrap-store';
import { relativeTime } from '@core/format';
import { FhButton } from '@ui/button';
import { FhEmptyState } from '@ui/empty-state';
import { FhErrorState } from '@ui/error-state';
import { FhSpinner } from '@ui/spinner';
import { RequestsStore } from '@feedback/data/requests-store';

@Component({
  selector: 'app-requests-page',
  imports: [RouterLink, FhButton, FhEmptyState, FhErrorState, FhSpinner],
  templateUrl: './requests-page.html',
})
export class RequestsPage {
  readonly store = inject(RequestsStore);
  readonly bootstrap = inject(BootstrapStore);
  readonly relativeTime = relativeTime;

  constructor() {
    void this.store.load();
  }
}
