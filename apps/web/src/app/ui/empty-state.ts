import { Component, input } from '@angular/core';

@Component({
  selector: 'fh-empty-state',
  template: `
    <div class="flex flex-col items-center gap-3 py-14 text-center">
      <p class="text-base font-medium text-zinc-700 dark:text-zinc-300">{{ title() }}</p>
      @if (hint()) {
        <p class="max-w-sm text-sm text-zinc-500">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class FhEmptyState {
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
}
