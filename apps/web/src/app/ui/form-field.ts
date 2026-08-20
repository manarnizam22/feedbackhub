import { Component, input } from '@angular/core';

/* Label + control + error slot. Consumers pass the control's id so label/for
   and error/aria-describedby stay wired: the error paragraph's id is
   `${inputId}-error` — set aria-describedby on the control accordingly. */
@Component({
  selector: 'fh-form-field',
  template: `
    <div class="flex flex-col gap-1.5">
      <label [for]="inputId()" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {{ label() }}
        @if (required()) {
          <span aria-hidden="true" class="text-red-500">*</span>
        }
      </label>
      <ng-content />
      @if (error()) {
        <p [id]="inputId() + '-error'" role="alert" class="text-sm text-red-600 dark:text-red-400">
          {{ error() }}
        </p>
      }
    </div>
  `,
})
export class FhFormField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly required = input(false);
}
