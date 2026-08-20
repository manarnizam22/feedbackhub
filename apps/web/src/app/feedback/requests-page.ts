import { Component } from '@angular/core';

import { FhEmptyState } from '../ui/empty-state';

@Component({
  selector: 'app-requests-page',
  imports: [FhEmptyState],
  template: `<fh-empty-state title="Requests" hint="The request list arrives with the next ticket." />`,
})
export class RequestsPage {}
