import { Component, input, output } from '@angular/core';

import { FhButton } from './button';

@Component({
  selector: 'fh-error-state',
  imports: [FhButton],
  template: `
    <div class="flex flex-col items-center gap-3 py-14 text-center" role="alert">
      <p class="text-base font-medium text-zinc-700 dark:text-zinc-300">Something went wrong</p>
      <p class="max-w-sm text-sm text-zinc-500">{{ message() }}</p>
      <button fh-button variant="ghost" type="button" (click)="retry.emit()">Try again</button>
    </div>
  `,
})
export class FhErrorState {
  readonly message = input('The request failed. Check your connection and try again.');
  readonly retry = output<void>();
}
