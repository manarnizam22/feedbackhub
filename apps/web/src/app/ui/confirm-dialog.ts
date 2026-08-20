import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { FhButton } from './button';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'fh-confirm-dialog',
  imports: [FhButton],
  template: `
    <div
      class="w-[90vw] max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 class="text-lg font-semibold">{{ data.title }}</h2>
      <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{{ data.message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button fh-button variant="ghost" type="button" (click)="ref.close(false)">Cancel</button>
        <button
          fh-button
          [variant]="data.danger ? 'danger' : 'primary'"
          type="button"
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
})
export class FhConfirmDialog {
  readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

/* CDK Dialog provides focus trap, Escape handling and focus restore. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(FhConfirmDialog, { data: options });
    const result = await firstValueFrom(ref.closed);
    return result === true;
  }
}
