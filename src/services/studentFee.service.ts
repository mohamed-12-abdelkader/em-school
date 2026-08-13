import * as feeModel from '../models/fee.model';
import { toInstallmentResource } from '../resources/installment.resource';
import { toPublicInstallmentStatus } from '../utils/installmentStatus';
import { HttpError } from '../utils';

export async function getStudentFeesAndInstallments(studentId: number, schoolId: number) {
  const data = await feeModel.getFeeWithInstallmentsForSchool(studentId, schoolId);
  if (!data) {
    return {
      fee: null,
      installments: [] as ReturnType<typeof toInstallmentResource>[],
    };
  }

  return {
    fee: data.fee,
    installments: data.installments.map((row, idx) => ({
      installmentNumber: idx + 1,
      ...toInstallmentResource(row),
    })),
  };
}

export async function payInstallment(
  installmentId: number,
  schoolId: number,
  receivedBy: number,
  amount?: number,
) {
  try {
    const result = await feeModel.payInstallment(installmentId, schoolId, receivedBy, amount);
    if (!result) {
      throw new HttpError(404, 'القسط غير موجود أو مدفوع مسبقًا');
    }
    const installment = toInstallmentResource(result.installment);
    return {
      ...installment,
      voucherId: result.voucher.voucherId,
      receivedBy: result.voucher.receivedBy,
      paidAt: result.voucher.paidAt,
      voucher: result.voucher,
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Overpayment') {
      throw new HttpError(400, 'لا يمكن تسديد القسط: يتجاوز المبلغ المتبقي');
    }
    if (e instanceof Error && e.message === 'InvalidAmount') {
      throw new HttpError(400, 'المبلغ يجب أن يكون أكبر من صفر');
    }
    throw e;
  }
}

export async function listOverdueInstallments(
  schoolId: number,
  filters: { gradeId?: number; classroomId?: number },
) {
  const rows = await feeModel.listOverdueInstallments(schoolId, filters);
  return {
    data: rows.map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      installmentId: row.installment_id,
      amount: Number(row.amount),
      dueDate: row.due_date,
    })),
  };
}

export async function getParentFees(parentUserId: number) {
  const rows = await feeModel.listFeesForParentUser(parentUserId);
  const byStudent = new Map<
    number,
    {
      studentId: number;
      studentName: string;
      installments: { amount: number; dueDate: string; status: string }[];
    }
  >();

  for (const row of rows) {
    let child = byStudent.get(row.student_id);
    if (!child) {
      child = {
        studentId: row.student_id,
        studentName: row.student_name,
        installments: [],
      };
      byStudent.set(row.student_id, child);
    }
    if (row.installment_id == null || row.amount == null || row.due_date == null || !row.status) {
      continue;
    }
    child.installments.push({
      amount: Number(row.amount),
      dueDate: row.due_date,
      status: toPublicInstallmentStatus(row.status, row.due_date),
    });
  }

  return { children: [...byStudent.values()] };
}
