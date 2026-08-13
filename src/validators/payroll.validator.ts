import { z } from 'zod/v4';

const money = z.coerce.number().finite();
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'paidAt must be YYYY-MM-DD' });
const noteSchema = z.string().trim().max(2000).optional().nullable();

export function normalizePayrollBody(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...raw };
  if (out.basicSalary === undefined && out.basic_salary !== undefined) {
    out.basicSalary = out.basic_salary;
  }
  if (out.paidAt === undefined && out.paid_at !== undefined) {
    out.paidAt = out.paid_at;
  }
  return out;
}

export const upsertSalarySchema = z.object({
  basicSalary: money.nonnegative(),
});

export const createSalaryPaymentSchema = z.object({
  amount: money.positive(),
  paidAt: dateString,
  note: noteSchema,
});

export const createSalaryAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'deduction']),
  amount: money.positive(),
  note: noteSchema,
});
