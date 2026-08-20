import { Component, input } from '@angular/core';

@Component({
  selector: 'fh-spinner',
  template: `
    <div class="flex items-center justify-center gap-3 py-10 text-zinc-500" role="status">
      <span
        class="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600"
        aria-hidden="true"
      ></span>
      <span class="text-sm">{{ label() }}</span>
    </div>
  `,
})
export class FhSpinner {
  readonly label = input('Loading…');
}
