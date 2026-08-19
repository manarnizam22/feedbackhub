import { z } from 'zod';

import { CategorySchema, StatusSchema } from './taxonomy.js';
import { PreferencesSchema, UserProfileSchema } from './user.js';

export const FeatureFlagsSchema = z.record(z.string(), z.boolean());

/* Everything the SPA needs to start, in one authenticated request — no chain
   of blocking calls on startup (ADR-0009). Preferences arrive already resolved:
   global defaults overlaid with the user's stored overrides, server-side. */
export const BootstrapResponseSchema = z.object({
  profile: UserProfileSchema,
  preferences: PreferencesSchema,
  taxonomy: z.object({
    categories: z.array(CategorySchema),
    statuses: z.array(StatusSchema),
  }),
  featureFlags: FeatureFlagsSchema,
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type BootstrapResponse = z.infer<typeof BootstrapResponseSchema>;
