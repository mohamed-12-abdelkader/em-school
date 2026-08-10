import { z } from 'zod/v4';

export const upsertGradeFeePlanSchema = z
  .object({
    totalAmount: z.coerce.number().positive(),
    installments: z
      .array(
        z.object({
          dueDate: z.string().trim().min(1),
          amount: z.coerce.number().positive(),
        }),
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    const sum = data.installments.reduce((a, x) => a + x.amount, 0);
    if (Math.abs(sum - data.totalAmount) > 0.02) {
      ctx.addIssue({
        code: 'custom',
        message: 'مجموع الأقساط يجب أن يساوي إجمالي المصروفات',
        path: ['installments'],
      });
    }
  });
