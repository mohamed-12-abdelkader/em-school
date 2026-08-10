import { z } from 'zod/v4';

export const createClassSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  capacity: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
});

export const updateClassSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    capacity: z.union([z.number().int().min(0).max(1_000_000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });
