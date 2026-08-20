import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { defineAbilityFor } from '@feedbackhub/auth';
import type { BootstrapResponse } from '@feedbackhub/types';

import { ApiError } from './api-error';
import { env } from './env';
import { applyTheme } from './theme';

/* Holds the single startup payload (ADR-0009). load() runs in the app
   initializer after login, so every component can read these signals without
   null-checking the world. */
@Injectable({ providedIn: 'root' })
export class BootstrapStore {
  private readonly http = inject(HttpClient);
  private readonly state = signal<BootstrapResponse | null>(null);

  readonly loaded = computed(() => this.state() !== null);
  readonly profile = computed(() => this.state()?.profile ?? null);
  readonly preferences = computed(() => this.state()?.preferences ?? null);
  readonly featureFlags = computed(() => this.state()?.featureFlags ?? {});
  readonly categories = computed(() => this.state()?.taxonomy.categories ?? []);
  readonly statuses = computed(() => this.state()?.taxonomy.statuses ?? []);
  readonly activeCategories = computed(() => this.categories().filter((c) => c.active));
  readonly isAdmin = computed(() => this.profile()?.isAdmin ?? false);
  /* the same CASL policy the API enforces (ADR-0008) — here it only decides
     what renders; the server remains the authority */
  readonly ability = computed(() => {
    const profile = this.profile();
    return profile ? defineAbilityFor({ id: profile.id, isAdmin: profile.isAdmin }) : null;
  });
  readonly initials = computed(() => {
    const name = this.profile()?.displayName ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  });

  readonly deniedMessage = signal<string | null>(null);

  async load(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<BootstrapResponse>(`${env.apiUrl}/bootstrap`),
      );
      this.state.set(data);
      applyTheme(data.preferences.theme);
    } catch (error) {
      if (error instanceof ApiError && error.problem.status === 403) {
        this.deniedMessage.set(error.message);
        return;
      }
      throw error;
    }
  }

  applyPreferences(preferences: BootstrapResponse['preferences']): void {
    const current = this.state();
    if (current) {
      this.state.set({ ...current, preferences });
      applyTheme(preferences.theme);
    }
  }

  applyDisplayName(displayName: string): void {
    const current = this.state();
    if (current) {
      this.state.set({ ...current, profile: { ...current.profile, displayName } });
    }
  }
}
