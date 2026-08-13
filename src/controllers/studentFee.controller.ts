import type { Request, Response } from 'express';
import * as studentFeeService from '../services/studentFee.service';
import { parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

function parseOptionalPositiveInt(q: Record<string, unknown>, key: string): number | undefined {
  const raw = q[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  return parsePositiveIntParam(String(raw), key);
}

export async function getStudentFees(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const result = await studentFeeService.getStudentFeesAndInstallments(studentId, schoolId);
  res.json(result);
}

export async function payInstallment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const installmentId = parsePositiveIntParam(
    req.params.installmentId ?? req.params.id,
    'installmentId',
  );
  const amount = (req.body as { amount?: number } | undefined)?.amount;
  const result = await studentFeeService.payInstallment(
    installmentId,
    schoolId,
    req.user!.id,
    amount,
  );
  res.json(result);
}

export async function listOverdue(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const query = req.query as Record<string, unknown>;
  const gradeId =
    parseOptionalPositiveInt(query, 'grade_id') ?? parseOptionalPositiveInt(query, 'gradeId');
  const classroomId =
    parseOptionalPositiveInt(query, 'classroom_id') ??
    parseOptionalPositiveInt(query, 'classroomId') ??
    parseOptionalPositiveInt(query, 'class_id') ??
    parseOptionalPositiveInt(query, 'classId');
  const result = await studentFeeService.listOverdueInstallments(schoolId, {
    gradeId,
    classroomId,
  });
  res.json(result);
}

export async function getParentFees(req: Request, res: Response) {
  const result = await studentFeeService.getParentFees(req.user!.id);
  res.json(result);
}
