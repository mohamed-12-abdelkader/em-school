import type { Request, Response } from 'express';
import type { GradeStage } from '../types/schoolAcademic';
import * as schoolGradeService from '../services/schoolGrade.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

export async function listGrades(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const result = await schoolGradeService.listGrades(schoolId, limit, skip);
  res.json(result);
}

export async function createGrade(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const { name, stage, description } = req.body as {
    name: string;
    stage: GradeStage;
    description?: string;
  };
  const grade = await schoolGradeService.createGrade(schoolId, { name, stage, description });
  res.status(201).json({ grade });
}

export async function getGrade(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const grade = await schoolGradeService.getGrade(gradeId, schoolId);
  res.json({ grade });
}

export async function updateGrade(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const grade = await schoolGradeService.updateGrade(gradeId, schoolId, req.body);
  res.json({ grade });
}

export async function deleteGrade(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  await schoolGradeService.deleteGrade(gradeId, schoolId);
  res.status(204).send();
}
