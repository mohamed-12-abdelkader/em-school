import type { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';
import type { SalaryAdjustmentType } from '../types/payroll';

export async function upsertSalary(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const staffId = parsePositiveIntParam(req.params.staffId, 'staffId');
  const { basicSalary } = req.body as { basicSalary: number };
  const result = await payrollService.upsertBasicSalary(schoolId, staffId, basicSalary);
  res.json(result);
}

export async function createSalaryPayment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const staffId = parsePositiveIntParam(req.params.staffId, 'staffId');
  const body = req.body as { amount: number; paidAt: string; note?: string | null };
  const result = await payrollService.recordSalaryPayment(schoolId, staffId, body);
  res.status(201).json(result);
}

export async function listSalaryPayments(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const staffId = parsePositiveIntParam(req.params.staffId, 'staffId');
  const result = await payrollService.listSalaryPayments(schoolId, staffId);
  res.json(result);
}

export async function createSalaryAdjustment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const staffId = parsePositiveIntParam(req.params.staffId, 'staffId');
  const body = req.body as {
    type: SalaryAdjustmentType;
    amount: number;
    note?: string | null;
  };
  const result = await payrollService.recordSalaryAdjustment(schoolId, staffId, body);
  res.status(201).json(result);
}
