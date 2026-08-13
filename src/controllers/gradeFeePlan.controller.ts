import type { Request, Response } from 'express';
import * as gradeFeePlanService from '../services/gradeFeePlan.service';
import { parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

export async function getGradeFeePlan(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const result = await gradeFeePlanService.getGradeFeePlan(schoolId, gradeId);
  res.json(result);
}

export async function saveGradeFeePlan(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const body = req.body as {
    totalAmount: number;
    installmentsCount?: number;
    installments?: { dueDate: string; amount: number }[];
  };
  const result = await gradeFeePlanService.saveGradeFeePlan(schoolId, gradeId, body);
  res.json(result);
}
