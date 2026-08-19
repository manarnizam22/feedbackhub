import { z } from 'zod';

export const ProblemSchema = z.object({
  status: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type Problem = z.infer<typeof ProblemSchema>;
