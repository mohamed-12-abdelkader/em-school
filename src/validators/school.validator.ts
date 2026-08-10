import { z } from 'zod/v4';

export const createSchoolSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});
