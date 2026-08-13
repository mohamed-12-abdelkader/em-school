import type { InstallmentRow } from '../types/gradeFeePlan';
import { toPublicInstallmentStatus } from '../utils/installmentStatus';

export function toInstallmentResource(row: InstallmentRow) {
  const amount = Number(row.amount);
  const paidAmount = Number(row.paid_amount ?? 0);
  return {
    id: row.id,
    installmentId: row.id,
    amount,
    paidAmount,
    remainingAmount: Number((amount - paidAmount).toFixed(2)),
    dueDate: row.due_date,
    due_date: row.due_date,
    status: toPublicInstallmentStatus(row.status, row.due_date),
    paidAt: row.paid_at,
    paid_at: row.paid_at,
  };
}
