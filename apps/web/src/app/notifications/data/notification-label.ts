import type { Notification } from '@feedbackhub/types';

const LABELS: Record<Notification['type'], string> = {
  vote: 'voted for',
  comment: 'commented on',
  new_request: 'submitted',
  pin: 'pinned',
  comment_pending: 'left a comment awaiting approval on',
  comment_approved: 'approved your comment on',
  comment_rejected: 'declined your comment on',
  status_change: 'moved',
};

export function notificationText(notification: Notification): string {
  const base = `${notification.actorName} ${LABELS[notification.type]} “${notification.requestTitle}”`;
  return notification.type === 'status_change' && notification.detail
    ? `${base} to ${notification.detail}`
    : base;
}

export function notificationLabel(type: Notification['type']): string {
  return LABELS[type];
}
