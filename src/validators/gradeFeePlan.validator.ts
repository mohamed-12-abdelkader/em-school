import { z } from 'zod/v4';

const installmentSchema = z.object({
  dueDate: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
});

export function normalizeFeePlanBody(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...raw };
  if (out.totalAmount === undefined && out.total_amount !== undefined) {
    out.totalAmount = out.total_amount;
  }
  if (out.installmentsCount === undefined && out.installments_count !== undefined) {
    out.installmentsCount = out.installments_count;
  }
  return out;
}

/**
 * Spec: `{ totalAmount, installmentsCount }`
 * Legacy: `{ totalAmount, installments: [{ dueDate, amount }] }`
 */
export const upsertGradeFeePlanSchema = z
  .object({
    totalAmount: z.coerce.number().positive(),
    installmentsCount: z.coerce.number().int().positive().max(24).optional(),
    installments: z.array(installmentSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.installments?.length) {
      const sum = data.installments.reduce((a, x) => a + x.amount, 0);
      if (Math.abs(sum - data.totalAmount) > 0.02) {
        ctx.addIssue({
          code: 'custom',
          message: 'مجموع الأقساط يجب أن يساوي إجمالي المصروفات',
          path: ['installments'],
        });
      }
      if (
        data.installmentsCount !== undefined &&
        data.installmentsCount !== data.installments.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'installmentsCount must match installments length',
          path: ['installmentsCount'],
        });
      }
      return;
    }

    if (!data.installmentsCount) {
      ctx.addIssue({
        code: 'custom',
        message: 'installmentsCount or installments is required',
        path: ['installmentsCount'],
      });
    }
  });
