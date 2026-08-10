import { z } from 'zod/v4';

export const scheduleDayOfWeekSchema = z.number().int().min(1).max(7);
export const schedulePeriodSchema = z.number().int().min(1).max(20);

export const createSlotSchema = z.object({
  dayOfWeek: scheduleDayOfWeekSchema,
  period: schedulePeriodSchema,
  subjectId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
});

export const updateSlotSchema = z
  .object({
    dayOfWeek: scheduleDayOfWeekSchema.optional(),
    period: schedulePeriodSchema.optional(),
    subjectId: z.number().int().positive().optional(),
    teacherId: z.number().int().positive().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });
