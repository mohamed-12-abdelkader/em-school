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
  address: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
  contactPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
});

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  description: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  email: z.string().email().toLowerCase().trim().optional(),
  address: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  contactPhone: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
});

/** Body for PATCH /admin/schools/:schoolId/status */
export const updateSchoolStatusSchema = z.object({
  action: z.enum(['activate', 'suspend', 'soft-delete']),
});
