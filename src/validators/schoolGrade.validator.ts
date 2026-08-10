import { z } from 'zod/v4';

export const gradeStageSchema = z.enum(['primary', 'preparatory', 'secondary']);

export const createGradeSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  stage: gradeStageSchema,
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
});

export const updateGradeSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    stage: gradeStageSchema.optional(),
    description: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (v === '' ? null : v)),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });
