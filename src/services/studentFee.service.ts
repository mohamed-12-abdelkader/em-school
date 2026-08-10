import * as feeModel from '../models/fee.model';
import { HttpError } from '../utils';

export async function getStudentFeesAndInstallments(studentId: number, schoolId: number) {
  const data = await feeModel.getFeeWithInstallmentsForSchool(studentId, schoolId);
  if (!data) {
    return {
      fee: null,
      installments: [] as Awaited<ReturnType<typeof feeModel.listInstallmentsByFeeId>>,
    };
  }

  const installments = data.installments.map((row, idx) => ({
    installmentNumber: idx + 1,
    id: row.id,
    amount: row.amount,
    due_date: row.due_date,
    status: row.status,
    paid_at: row.paid_at,
  }));

  return {
    fee: data.fee,
    installments,
  };
}

export async function payInstallment(installmentId: number, schoolId: number) {
  try {
    const result = await feeModel.markInstallmentPaid(installmentId, schoolId);
    if (!result) {
      throw new HttpError(404, 'القسط غير موجود أو مدفوع مسبقًا');
    }
    return result;
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Overpayment') {
      throw new HttpError(400, 'لا يمكن تسديد القسط: يتجاوز المبلغ المتبقي');
    }
    throw e;
  }
}
