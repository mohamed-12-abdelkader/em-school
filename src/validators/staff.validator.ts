import { z } from 'zod/v4';

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, { message: 'Invalid phone' });

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().email().toLowerCase().trim(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
});

export const updateStaffStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});
