import type { GradeFeePlanInstallmentRow, GradeFeePlanRow } from '../types/gradeFeePlan';

export function toFeePlanResource(
  gradeId: number,
  plan: GradeFeePlanRow | null,
  installments: GradeFeePlanInstallmentRow[],
) {
  if (!plan) {
    return {
      gradeId,
      totalAmount: null as number | null,
      installmentsCount: 0,
      installments: [] as Array<{
        id: number;
        installmentNumber: number;
        dueDate: string;
        amount: number;
      }>,
    };
  }

  return {
    gradeId,
    id: plan.id,
    totalAmount: Number(plan.total_amount),
    installmentsCount: installments.length,
    installments: installments.map((row) => ({
      id: row.id,
      installmentNumber: row.installment_number,
      dueDate: row.due_date,
      amount: Number(row.amount),
    })),
  };
}

/** Split total into N equal installments; last row absorbs remainder cents. */
export function splitEqualInstallments(
  totalAmount: number,
  count: number,
  firstDueDate: string,
): { dueDate: string; amount: number }[] {
  const cents = Math.round(totalAmount * 100);
  const each = Math.floor(cents / count);
  const out: { dueDate: string; amount: number }[] = [];
  let allocated = 0;
  const start = new Date(`${firstDueDate}T00:00:00.000Z`);

  for (let i = 0; i < count; i++) {
    const amountCents = i === count - 1 ? cents - allocated : each;
    allocated += amountCents;
    const due = new Date(start);
    due.setUTCMonth(due.getUTCMonth() + i);
    out.push({
      dueDate: due.toISOString().slice(0, 10),
      amount: amountCents / 100,
    });
  }
  return out;
}
