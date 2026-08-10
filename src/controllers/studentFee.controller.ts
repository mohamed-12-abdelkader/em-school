import type { Request, Response } from 'express';
import * as studentFeeService from '../services/studentFee.service';
import { parsePositiveIntParam } from '../utils/pagination';

export async function getStudentFees(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const result = await studentFeeService.getStudentFeesAndInstallments(studentId, schoolId);
  res.json(result);
}

export async function payInstallment(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const installmentId = parsePositiveIntParam(req.params.installmentId, 'installmentId');
  const result = await studentFeeService.payInstallment(installmentId, schoolId);
  res.json({ ok: true, feeId: result.feeId, studentId: result.studentId });
}
