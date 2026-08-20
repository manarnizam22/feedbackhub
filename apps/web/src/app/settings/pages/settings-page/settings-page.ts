import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Preferences } from '@feedbackhub/types';

import { ApiError } from '@core/api-error';
import { BootstrapStore } from '@core/bootstrap-store';
import { logout } from '@core/keycloak';
import { FhButton } from '@ui/button';
import { FhFormField } from '@ui/form-field';
import { ConfirmService } from '@ui/confirm-dialog';
import { SettingsApi } from '@settings/data/settings-api';

@Component({
  selector: 'app-settings-page',
  imports: [FhButton, FhFormField],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);
  private readonly confirm = inject(ConfirmService);
  readonly bootstrap = inject(BootstrapStore);

  readonly displayName = signal(this.bootstrap.profile()?.displayName ?? '');
  readonly theme = signal<Preferences['theme']>(this.bootstrap.preferences()?.theme ?? 'system');
  readonly language = signal(this.bootstrap.preferences()?.language ?? 'en');
  readonly defaultSort = signal<Preferences['defaultSort']>(
    this.bootstrap.preferences()?.defaultSort ?? 'newest',
  );
  readonly defaultStatus = signal(this.bootstrap.preferences()?.defaultFilters.statusId ?? '');
  readonly defaultCategory = signal(this.bootstrap.preferences()?.defaultFilters.categoryId ?? '');
  readonly notifyOnComment = signal(this.bootstrap.preferences()?.notifyOnComment ?? true);

  readonly savingProfile = signal(false);
  readonly savingPrefs = signal(false);
  readonly profileMessage = signal('');
  readonly prefsMessage = signal('');
  readonly profileError = signal('');

  readonly initialsPreview = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  async saveProfile(): Promise<void> {
    this.savingProfile.set(true);
    this.profileError.set('');
    this.profileMessage.set('');
    try {
      const updated = await firstValueFrom(
        this.api.updateProfile({ displayName: this.displayName().trim() }),
      );
      this.bootstrap.applyDisplayName(updated.displayName);
      this.profileMessage.set('Profile saved');
    } catch (error) {
      this.profileError.set(
        error instanceof ApiError ? error.message : 'Could not save the profile',
      );
    } finally {
      this.savingProfile.set(false);
    }
  }

  async savePreferences(): Promise<void> {
    this.savingPrefs.set(true);
    this.prefsMessage.set('');
    const body: Preferences = {
      theme: this.theme(),
      language: this.language(),
      defaultSort: this.defaultSort(),
      defaultFilters: {
        ...(this.defaultStatus() ? { statusId: this.defaultStatus() } : {}),
        ...(this.defaultCategory() ? { categoryId: this.defaultCategory() } : {}),
      },
      notifyOnComment: this.notifyOnComment(),
    };
    try {
      const saved = await firstValueFrom(this.api.updatePreferences(body));
      this.bootstrap.applyPreferences(saved);
      this.prefsMessage.set('Preferences saved');
    } catch {
      this.prefsMessage.set('Could not save preferences — try again');
    } finally {
      this.savingPrefs.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete your account?',
      message:
        'Your account is deactivated and you will be signed out. Your requests and comments stay on the board. Signing in again reactivates the account.',
      confirmLabel: 'Delete account',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await firstValueFrom(this.api.deleteAccount());
    logout();
  }
}
