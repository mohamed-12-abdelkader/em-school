import type { Request, Response } from 'express';
import * as schoolClassService from '../services/schoolClass.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';

export async function listClassesByGrade(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const result = await schoolClassService.listClassesByGrade(gradeId, schoolId, limit, skip);
  res.json(result);
}

export async function createClassInGrade(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const gradeId = parsePositiveIntParam(req.params.gradeId, 'gradeId');
  const body = req.body as { name: string; capacity?: number | null };
  const schoolClass = await schoolClassService.createClassInGrade(gradeId, schoolId, body);
  res.status(201).json({ class: schoolClass });
}

export async function getClassById(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolClass = await schoolClassService.getClass(classId, schoolId);
  res.json({ class: schoolClass });
}

export async function updateClass(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolClass = await schoolClassService.updateClass(classId, schoolId, req.body);
  res.json({ class: schoolClass });
}

export async function deleteClass(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  await schoolClassService.deleteClass(classId, schoolId);
  res.status(204).send();
}
