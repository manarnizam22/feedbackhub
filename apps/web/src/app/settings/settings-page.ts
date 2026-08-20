import { Component } from '@angular/core';

import { FhEmptyState } from '../ui/empty-state';

@Component({
  selector: 'app-settings-page',
  imports: [FhEmptyState],
  template: `<fh-empty-state
    title="Settings"
    hint="Profile and preferences arrive with their ticket."
  />`,
})
export class SettingsPage {}
