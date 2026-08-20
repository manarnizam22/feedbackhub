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

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty').max(80),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
