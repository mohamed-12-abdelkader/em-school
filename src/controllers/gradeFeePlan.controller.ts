import type { Request, Response } from 'express';
import * as gradeFeePlanService from '../services/gradeFeePlan.service';
import { parsePositiveIntParam } from '../utils/pagination';

export async function getGradeFeePlan(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const result = await gradeFeePlanService.getGradeFeePlan(schoolId, gradeId);
  res.json(result);
}

export async function saveGradeFeePlan(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const body = req.body as {
    totalAmount: number;
    installments: { dueDate: string; amount: number }[];
  };
  const result = await gradeFeePlanService.saveGradeFeePlan(schoolId, gradeId, body);
  res.json(result);
}
