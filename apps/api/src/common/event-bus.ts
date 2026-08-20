import { EventEmitter } from 'node:events';
import type { ChangeEvent, Notification } from '@feedbackhub/types';

export interface CommittedMutation extends ChangeEvent {
  actorId: string;
}

/* In-process fan-out (ADR-0010): one emitter, two channels. Single-replica by
   design — the k8s manifests pin the API to one pod; Redis pub/sub is the
   documented scale-out path. */
class AppEventBus extends EventEmitter {
  emitChange(event: CommittedMutation): void {
    this.emit('change', event);
  }

  emitNotification(userId: string, notification: Notification): void {
    this.emit('notification', { userId, notification });
  }
}

export const eventBus = new AppEventBus();
eventBus.setMaxListeners(1000);
