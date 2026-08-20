import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AdminSettings, PendingComment } from '@feedbackhub/types';

import { ApiError } from '@core/api-error';
import { BootstrapStore } from '@core/bootstrap-store';
import { relativeTime } from '@core/format';
import { FhButton } from '@ui/button';
import { FhSpinner } from '@ui/spinner';
import { AdminApi } from '@admin/data/admin-api';

/* One page, four sections: moderation queue, categories, statuses, app
   settings. The bootstrap store is refreshed after taxonomy/settings changes so
   the whole app picks them up without a reload. */
@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, FhButton, FhSpinner],
  templateUrl: './admin-page.html',
})
export class AdminPage {
  private readonly api = inject(AdminApi);
  readonly bootstrap = inject(BootstrapStore);
  readonly relativeTime = relativeTime;

  readonly pending = signal<PendingComment[] | null>(null);
  readonly settings = signal<AdminSettings | null>(null);
  readonly newCategory = signal('');
  readonly newStatus = signal('');
  readonly message = signal('');
  readonly error = signal('');

  constructor() {
    void this.loadPending();
    void this.loadSettings();
  }

  async loadPending(): Promise<void> {
    this.pending.set(await firstValueFrom(this.api.pendingComments()));
  }

  async loadSettings(): Promise<void> {
    this.settings.set(await firstValueFrom(this.api.getSettings()));
  }

  async approve(id: string): Promise<void> {
    await firstValueFrom(this.api.approveComment(id));
    await this.loadPending();
  }

  async reject(id: string): Promise<void> {
    await firstValueFrom(this.api.deleteComment(id));
    await this.loadPending();
  }

  async addCategory(): Promise<void> {
    const name = this.newCategory().trim();
    if (!name) {
      return;
    }
    await this.run(async () => {
      await firstValueFrom(
        this.api.createCategory({
          name,
          position: this.bootstrap.categories().length + 1,
          active: true,
        }),
      );
      this.newCategory.set('');
      await this.bootstrap.load();
    });
  }

  async toggleCategory(id: string, active: boolean): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.updateCategory(id, { active }));
      await this.bootstrap.load();
    });
  }

  async addStatus(): Promise<void> {
    const name = this.newStatus().trim();
    if (!name) {
      return;
    }
    await this.run(async () => {
      await firstValueFrom(
        this.api.createStatus({
          name,
          position: this.bootstrap.statuses().length + 1,
          active: true,
          isDefault: false,
        }),
      );
      this.newStatus.set('');
      await this.bootstrap.load();
    });
  }

  async toggleStatus(id: string, active: boolean): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.updateStatus(id, { active }));
      await this.bootstrap.load();
    });
  }

  async makeDefault(id: string): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.updateStatus(id, { isDefault: true }));
      await this.bootstrap.load();
    });
  }

  patchSettings(patch: Partial<AdminSettings>): void {
    const current = this.settings();
    if (current) {
      this.settings.set({ ...current, ...patch });
    }
  }

  toggleFlag(flag: string): void {
    const current = this.settings();
    if (current) {
      this.settings.set({
        ...current,
        featureFlags: { ...current.featureFlags, [flag]: !current.featureFlags[flag] },
      });
    }
  }

  async saveSettings(): Promise<void> {
    const body = this.settings();
    if (!body) {
      return;
    }
    await this.run(async () => {
      this.settings.set(await firstValueFrom(this.api.updateSettings(body)));
      await this.bootstrap.load();
      this.message.set('Settings saved');
    });
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.message.set('');
    try {
      await fn();
    } catch (error) {
      this.error.set(error instanceof ApiError ? error.message : 'The action failed — try again');
    }
  }
}
