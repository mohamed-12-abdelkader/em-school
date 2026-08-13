import * as payrollModel from '../models/payroll.model';
import {
  toMoney,
  toSalaryAdjustmentResource,
  toSalaryPaymentResource,
} from '../resources/payroll.resource';
import type { SalaryAdjustmentType } from '../types/payroll';
import { HttpError } from '../utils';

async function requireStaffUserId(schoolId: number, staffId: number): Promise<number> {
  const userId = await payrollModel.resolveStaffUserId(schoolId, staffId);
  if (!userId) throw new HttpError(404, 'Staff not found');
  return userId;
}

export async function upsertBasicSalary(schoolId: number, staffId: number, basicSalary: number) {
  const staffUserId = await requireStaffUserId(schoolId, staffId);
  const row = await payrollModel.upsertBasicSalary(schoolId, staffUserId, basicSalary);
  return { staffId, basicSalary: toMoney(row.basic_salary) };
}

export async function recordSalaryPayment(
  schoolId: number,
  staffId: number,
  input: { amount: number; paidAt: string; note?: string | null },
) {
  const staffUserId = await requireStaffUserId(schoolId, staffId);
  const row = await payrollModel.insertPayment({
    schoolId,
    staffUserId,
    amount: input.amount,
    paidAt: input.paidAt,
    note: input.note?.trim() ? input.note.trim() : null,
  });
  return toSalaryPaymentResource(row);
}

export async function listSalaryPayments(schoolId: number, staffId: number) {
  const staffUserId = await requireStaffUserId(schoolId, staffId);
  const rows = await payrollModel.listPayments(schoolId, staffUserId);
  return { data: rows.map(toSalaryPaymentResource) };
}

export async function recordSalaryAdjustment(
  schoolId: number,
  staffId: number,
  input: { type: SalaryAdjustmentType; amount: number; note?: string | null },
) {
  const staffUserId = await requireStaffUserId(schoolId, staffId);
  const row = await payrollModel.insertAdjustment({
    schoolId,
    staffUserId,
    type: input.type,
    amount: input.amount,
    note: input.note?.trim() ? input.note.trim() : null,
  });
  return toSalaryAdjustmentResource(row, staffId);
}
