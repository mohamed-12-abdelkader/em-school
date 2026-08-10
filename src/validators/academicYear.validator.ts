import { z } from 'zod/v4';

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' });

export const createAcademicYearSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startDate: dateString,
  endDate: dateString,
  isCurrent: z.boolean().optional(),
});

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
