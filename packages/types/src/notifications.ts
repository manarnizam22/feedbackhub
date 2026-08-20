import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.uuid(),
  type: z.enum([
    'vote',
    'comment',
    'new_request',
    'pin',
    'comment_pending',
    'comment_approved',
    'comment_rejected',
    'status_change',
  ]),
  detail: z.string().nullish(),
  actorName: z.string(),
  requestId: z.uuid(),
  requestTitle: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const NotificationsResponseSchema = z.object({
  items: z.array(NotificationSchema),
  unread: z.number().int(),
});

/* What the SSE stream carries: broadcast change hints (clients refetch what
   they show) and per-user notification pushes. */
export const ChangeEventSchema = z.object({
  kind: z.literal('change'),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
});

export const NotificationEventSchema = z.object({
  kind: z.literal('notification'),
  notification: NotificationSchema,
});

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
export type ChangeEvent = z.infer<typeof ChangeEventSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
