import { z } from 'zod/v4';

const phoneSchema = z
  .string()
  .trim()
  .min(8, { message: 'رقم الهاتف قصير جدًا' })
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, { message: 'رقم الهاتف غير صالح' });

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ يجب أن يكون YYYY-MM-DD' });

const relationshipSchema = z.enum(['father', 'mother', 'guardian', 'other']);
const statusSchema = z.enum(['active', 'suspended', 'graduated', 'transferred']);
const genderSchema = z.enum(['male', 'female']);

const nationalIdSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(/^\d{14}$/, { message: 'الرقم القومي يجب أن يكون 14 رقمًا' }),
    z.literal(''),
    z.null(),
  ])
  .optional();

/**
 * إنشاء طالب — JSON أو multipart (بعد multer تُعامل الحقول كنصوص؛ لذا coerce للأرقام).
 * يدعم الأسماء الجديدة + توافق مع fullName / classId القديم.
 */
export const createStudentEnrollmentSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    /** توافق خلفي */
    fullName: z.string().trim().min(1).max(255).optional(),
    gender: genderSchema.optional(),
    birthDate: dateString.optional(),
    dateOfBirth: dateString.optional(),
    nationalId: nationalIdSchema,
    address: z.string().trim().max(2000).optional().nullable(),
    studentPhone: z.union([phoneSchema, z.literal('')]).optional().nullable(),
    phone: z.union([phoneSchema, z.literal('')]).optional().nullable(),
    /** إن لم يُرسل تُستخدم السنة الدراسية الحالية للمدرسة */
    academicYearId: z.coerce.number().int().positive().optional(),
    gradeId: z.coerce.number().int().positive(),
    classroomId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    parentName: z.string().trim().min(1).max(255).optional(),
    parentFullName: z.string().trim().min(1).max(255).optional(),
    parentPhone: phoneSchema,
    parentEmail: z.union([z.string().trim().email(), z.literal(''), z.null()]).optional(),
    relationship: relationshipSchema.optional(),
    parentRelation: z.enum(['father', 'mother', 'other']).optional(),
    status: statusSchema.optional(),
    /** كلمة مرور اختيارية لحساب الطالب؛ إن لم تُرسل تُولَّد تلقائيًا */
    password: z.string().min(8).max(72).optional(),
  })
  .superRefine((data, ctx) => {
    const hasParts = Boolean(data.firstName?.trim()) && Boolean(data.lastName?.trim());
    const hasFull = Boolean(data.fullName?.trim());
    if (!hasParts && !hasFull) {
      ctx.addIssue({
        code: 'custom',
        message: 'يجب إرسال firstName و lastName أو fullName',
        path: ['firstName'],
      });
    }
    if (!data.classroomId && !data.classId) {
      ctx.addIssue({
        code: 'custom',
        message: 'يجب إرسال classroomId أو classId',
        path: ['classroomId'],
      });
    }
    if (!data.birthDate && !data.dateOfBirth && !data.nationalId) {
      ctx.addIssue({
        code: 'custom',
        message: 'يجب إرسال birthDate أو الرقم القومي لاستنتاج تاريخ الميلاد',
        path: ['birthDate'],
      });
    }
    if (!data.gender && !data.nationalId) {
      ctx.addIssue({
        code: 'custom',
        message: 'يجب إرسال gender أو الرقم القومي لاستنتاج النوع',
        path: ['gender'],
      });
    }
  });

export const updateStudentSchema = z
  .object({
    academicYearId: z.coerce.number().int().positive().optional(),
    gradeId: z.coerce.number().int().positive().optional(),
    classroomId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    fullName: z.string().trim().min(1).max(255).optional(),
    nationalId: nationalIdSchema,
    birthDate: dateString.optional(),
    dateOfBirth: dateString.optional(),
    gender: genderSchema.optional(),
    address: z.union([z.string().trim().max(2000), z.null()]).optional(),
    studentPhone: z.union([phoneSchema, z.literal(''), z.null()]).optional(),
    phone: z.union([phoneSchema, z.literal(''), z.null()]).optional(),
    parentName: z.string().trim().min(1).max(255).optional(),
    parentPhone: z.union([phoneSchema, z.null()]).optional(),
    parentEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    relationship: relationshipSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
