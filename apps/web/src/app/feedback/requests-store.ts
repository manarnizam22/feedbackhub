import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ListRequestsResponse, RequestListItem } from '@feedbackhub/types';

import { ApiError } from '../core/api-error';
import { BootstrapStore } from '../core/bootstrap-store';
import { FeedbackApi } from './feedback-api';

export type ListState = 'loading' | 'error' | 'ready';

/* Root-provided so filters and page survive navigating into a request and
   back. Query state initialises from the user's saved default sort/filters
   (bootstrap payload) — the preference visibly does something. */
@Injectable({ providedIn: 'root' })
export class RequestsStore {
  private readonly api = inject(FeedbackApi);
  private readonly bootstrap = inject(BootstrapStore);

  readonly page = signal(1);
  readonly sort = signal(this.bootstrap.preferences()?.defaultSort ?? 'newest');
  readonly status = signal(this.bootstrap.preferences()?.defaultFilters.statusId ?? '');
  readonly category = signal(this.bootstrap.preferences()?.defaultFilters.categoryId ?? '');
  readonly q = signal('');
  readonly mine = signal(false);

  readonly state = signal<ListState>('loading');
  readonly data = signal<ListRequestsResponse | null>(null);
  readonly errorMessage = signal('The request failed. Check your connection and try again.');

  readonly hasFilters = computed(
    () => !!(this.q() || this.status() || this.category() || this.mine()),
  );
  readonly totalPages = computed(() => {
    const current = this.data();
    return current ? Math.max(1, Math.ceil(current.total / current.pageSize)) : 1;
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const data = await firstValueFrom(
        this.api.list({
          page: this.page(),
          sort: this.sort(),
          status: this.status() || undefined,
          category: this.category() || undefined,
          q: this.q() || undefined,
          mine: this.mine() || undefined,
        }),
      );
      this.data.set(data);
      this.state.set('ready');
    } catch (error) {
      if (error instanceof ApiError) {
        this.errorMessage.set(error.message);
      }
      this.state.set('error');
    }
  }

  setFilter(patch: { sort?: string; status?: string; category?: string; mine?: boolean }): void {
    if (patch.sort !== undefined) {
      this.sort.set(patch.sort as ReturnType<RequestsStore['sort']>);
    }
    if (patch.status !== undefined) {
      this.status.set(patch.status);
    }
    if (patch.category !== undefined) {
      this.category.set(patch.category);
    }
    if (patch.mine !== undefined) {
      this.mine.set(patch.mine);
    }
    this.page.set(1);
    void this.load();
  }

  search(term: string): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.q.set(term);
      this.page.set(1);
      void this.load();
    }, 300);
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
    void this.load();
  }

  clearFilters(): void {
    this.q.set('');
    this.status.set('');
    this.category.set('');
    this.mine.set(false);
    this.page.set(1);
    void this.load();
  }

  /* Optimistic: flip locally, call the API, roll back if it rejects. */
  async toggleVote(item: RequestListItem): Promise<void> {
    const current = this.data();
    if (!current) {
      return;
    }
    const apply = (myVote: boolean, delta: number) =>
      this.data.set({
        ...current,
        items: current.items.map((entry) =>
          entry.id === item.id
            ? { ...entry, myVote, voteCount: entry.voteCount + delta }
            : entry,
        ),
      });
    const voting = !item.myVote;
    apply(voting, voting ? 1 : -1);
    try {
      await firstValueFrom(voting ? this.api.vote(item.id) : this.api.unvote(item.id));
    } catch {
      apply(!voting, voting ? -1 : 1);
    }
  }
}
