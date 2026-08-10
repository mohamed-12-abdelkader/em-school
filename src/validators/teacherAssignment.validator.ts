import { z } from 'zod/v4';

export const createTeacherAssignmentSchema = z.object({
  academicYearId: z.coerce.number().int().positive(),
  teacherId: z.coerce.number().int().positive(),
  gradeId: z.coerce.number().int().positive(),
  classroomId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
});

export const updateTeacherAssignmentSchema = z
  .object({
    academicYearId: z.coerce.number().int().positive().optional(),
    teacherId: z.coerce.number().int().positive().optional(),
    gradeId: z.coerce.number().int().positive().optional(),
    classroomId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
