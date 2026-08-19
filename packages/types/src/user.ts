import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  isAdmin: z.boolean(),
});

export const PreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  defaultSort: z.enum(['newest', 'oldest', 'votes', 'comments']),
  defaultFilters: z.object({
    statusId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
  }),
  notifyOnComment: z.boolean(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
