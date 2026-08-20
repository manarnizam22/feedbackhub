import { Component, Injectable, signal } from '@angular/core';

import { FhIcon } from './icons';

interface Toast {
  id: number;
  message: string;
}

const TOAST_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string): void {
    const id = this.nextId++;
    this.toasts.update((current) => [...current, { id, message }]);
    setTimeout(() => {
      this.toasts.update((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_MS);
  }
}

@Component({
  selector: 'fh-toasts',
  imports: [FhIcon],
  template: `
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      @for (toast of service.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white/95 px-4 py-3 text-sm shadow-xl shadow-zinc-900/10 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/40"
          style="animation: fh-toast-in 0.18s ease-out"
        >
          <span
            class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
          >
            <fh-icon name="bell" [size]="14" />
          </span>
          <span class="leading-snug">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
})
export class FhToasts {
  constructor(readonly service: ToastService) {}
}
