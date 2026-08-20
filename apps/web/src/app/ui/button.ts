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
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none';

  readonly classes = computed(() => {
    const variants = {
      primary:
        'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-500/30',
      ghost:
        'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
      danger:
        'bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-500 hover:shadow-md hover:shadow-red-500/30',
    } as const;
    return `${this.base} ${variants[this.variant()]}`;
  });
}
