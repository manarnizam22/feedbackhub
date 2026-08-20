import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Notification, NotificationsResponse } from '@feedbackhub/types';

import { env } from '@core/env';
import { live } from '@core/live';
import { ToastService } from '@ui/toast';

import { notificationText } from './notification-label';

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(ToastService);

  readonly items = signal<Notification[]>([]);
  readonly unread = signal(0);
  readonly hasUnread = computed(() => this.unread() > 0);

  constructor() {
    live.onNotification((notification) => {
      this.items.update((current) => [notification, ...current].slice(0, 20));
      this.unread.update((count) => count + 1);
      this.toasts.show(notificationText(notification));
    });
  }

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<NotificationsResponse>(`${env.apiUrl}/me/notifications`),
    );
    this.items.set(data.items);
    this.unread.set(data.unread);
  }

  async markAllRead(): Promise<void> {
    if (this.unread() === 0) {
      return;
    }
    await firstValueFrom(this.http.post<void>(`${env.apiUrl}/me/notifications/read`, {}));
    this.unread.set(0);
    this.items.update((items) => items.map((item) => ({ ...item, read: true })));
  }
}
