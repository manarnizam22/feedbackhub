import type { ChangeEvent, Notification } from '@feedbackhub/types';

import { env } from './env';
import { keycloak } from './keycloak';

type ChangeListener = (event: ChangeEvent) => void;
type NotificationListener = (notification: Notification) => void;

const TOKEN_ROTATE_MS = 4 * 60 * 1000;

/* One EventSource for the app (ADR-0010). EventSource cannot send headers, so
   the token rides the URL; the connection is rebuilt every few minutes so the
   stream never outlives its token, and EventSource's built-in retry covers
   drops in between. */
class LiveClient {
  private source: EventSource | null = null;
  private readonly changeListeners = new Set<ChangeListener>();
  private readonly notificationListeners = new Set<NotificationListener>();

  start(): void {
    this.connect();
    setInterval(() => this.connect(), TOKEN_ROTATE_MS);
  }

  onChange(listener: ChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  private connect(): void {
    this.source?.close();
    const token = keycloak.token ?? '';
    this.source = new EventSource(`${env.apiUrl}/events?access_token=${encodeURIComponent(token)}`);
    this.source.onmessage = (message) => {
      const data = JSON.parse(message.data as string) as
        ChangeEvent | { kind: 'notification'; notification: Notification } | { kind: 'ping' };
      if (data.kind === 'change') {
        for (const listener of this.changeListeners) {
          listener(data);
        }
      } else if (data.kind === 'notification') {
        for (const listener of this.notificationListeners) {
          listener(data.notification);
        }
      }
    };
  }
}

export const live = new LiveClient();
