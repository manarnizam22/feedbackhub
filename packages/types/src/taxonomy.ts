import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
  position: z.number().int(),
});

export const StatusSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  isDefault: z.boolean(),
  active: z.boolean(),
});

export type Category = z.infer<typeof CategorySchema>;
export type Status = z.infer<typeof StatusSchema>;
