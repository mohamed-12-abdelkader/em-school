import { z } from 'zod/v4';

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, { message: 'رقم الهاتف غير صالح' });

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ يجب أن يكون YYYY-MM-DD' });

const genderSchema = z.enum(['male', 'female']);
const statusSchema = z.enum(['active', 'suspended']);

export const createTeacherSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    fullName: z.string().trim().min(1).max(255).optional(),
    /** توافق خلفي */
    name: z.string().trim().min(1).max(200).optional(),
    gender: genderSchema,
    phone: phoneSchema,
    hireDate: dateString,
    email: z.union([z.string().trim().email(), z.literal(''), z.null()]).optional(),
    nationalId: z
      .union([
        z
          .string()
          .trim()
          .regex(/^\d{14}$/, { message: 'الرقم القومي 14 رقمًا' }),
        z.literal(''),
        z.null(),
      ])
      .optional(),
    address: z.string().trim().max(2000).optional().nullable(),
    photo: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    specialization: z.string().trim().max(255).optional().nullable(),
    status: statusSchema.optional(),
    description: z.string().max(2000).optional().nullable(),
    subjectId: z.coerce.number().int().positive().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .superRefine((data, ctx) => {
    const hasParts = Boolean(data.firstName?.trim()) && Boolean(data.lastName?.trim());
    const hasFull = Boolean(data.fullName?.trim() || data.name?.trim());
    if (!hasParts && !hasFull) {
      ctx.addIssue({
        code: 'custom',
        message: 'يجب إرسال firstName و lastName أو fullName/name',
        path: ['firstName'],
      });
    }
  });

export const updateTeacherSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    fullName: z.string().trim().min(1).max(255).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    gender: genderSchema.optional(),
    phone: phoneSchema.optional(),
    hireDate: dateString.optional(),
    email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    nationalId: z
      .union([
        z
          .string()
          .trim()
          .regex(/^\d{14}$/),
        z.literal(''),
        z.null(),
      ])
      .optional(),
    address: z.union([z.string().trim().max(2000), z.null()]).optional(),
    photo: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    specialization: z.union([z.string().trim().max(255), z.null()]).optional(),
    status: statusSchema.optional(),
    description: z.union([z.string().max(2000), z.null()]).optional(),
    subjectId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const assignTeacherToClassesSchema = z.object({
  classIds: z.array(z.coerce.number().int().positive()).nonempty('classIds is required'),
});
