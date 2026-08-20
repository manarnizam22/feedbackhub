import { z } from 'zod';

export const UpsertCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(60),
  position: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const UpsertStatusSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(60),
  position: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const AdminSettingsSchema = z.object({
  registrationPolicy: z.object({
    mode: z.enum(['open', 'invite-only', 'domain-restricted']),
    allowedDomains: z.array(z.string().trim().min(1)),
  }),
  commentsRequireApproval: z.boolean(),
  submissionsPerUserPerDay: z.number().int().min(1).max(1000),
  featureFlags: z.record(z.string(), z.boolean()),
});

export const PendingCommentSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  requestTitle: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export type UpsertCategory = z.infer<typeof UpsertCategorySchema>;
export type UpsertStatus = z.infer<typeof UpsertStatusSchema>;
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;
export type PendingComment = z.infer<typeof PendingCommentSchema>;
