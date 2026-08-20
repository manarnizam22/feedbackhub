import { Component, computed, input } from '@angular/core';

/* Attribute selector on real <button>/<a> keeps native keyboard and screen
   reader semantics — the primitive only styles. */
@Component({
  selector: 'button[fh-button], a[fh-button]',
  template: '<ng-content />',
  host: {
    '[class]': 'classes()',
    '[attr.data-variant]': 'variant()',
  },
})
export class FhButton {
  readonly variant = input<'primary' | 'ghost' | 'danger'>('primary');

  private readonly base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  readonly classes = computed(() => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
      ghost:
        'bg-transparent text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800',
      danger: 'bg-red-600 text-white hover:bg-red-500',
    } as const;
    return `${this.base} ${variants[this.variant()]}`;
  });
}
