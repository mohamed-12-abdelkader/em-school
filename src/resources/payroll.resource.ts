import type { SalaryAdjustmentRow, SalaryPaymentRow } from '../types/payroll';

export function toMoney(value: string): number {
  return Number(value);
}

export function toSalaryPaymentResource(row: SalaryPaymentRow) {
  return {
    id: row.id,
    amount: toMoney(row.amount),
    paidAt: row.paid_at,
    note: row.note,
  };
}

export function toSalaryAdjustmentResource(row: SalaryAdjustmentRow, staffId: number) {
  return {
    id: row.id,
    staffId,
    type: row.type,
    amount: toMoney(row.amount),
    note: row.note,
    createdAt: row.created_at,
  };
}
