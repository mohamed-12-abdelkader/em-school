import type { Request, Response } from 'express';
import * as classSubjectService from '../services/schoolClassSubject.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';

export async function listClassSubjects(req: Request, res: Response) {
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolId = req.user!.id;
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);

  const result = await classSubjectService.listClassSubjects({
    schoolId,
    classId,
    limit,
    skip,
  });

  res.json(result);
}

export async function addSubjectsToClass(req: Request, res: Response) {
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolId = req.user!.id;

  const body = req.body as { subjectIds: number[] };
  await classSubjectService.addSubjectsToClass({ schoolId, classId, subjectIds: body.subjectIds });

  res.status(201).json({ message: 'Subjects added to class successfully' });
}

export async function replaceSubjectsForClass(req: Request, res: Response) {
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolId = req.user!.id;

  const body = req.body as { subjectIds: number[] };
  await classSubjectService.replaceClassSubjects({
    schoolId,
    classId,
    subjectIds: body.subjectIds,
  });

  res.json({ message: 'Class subjects updated successfully' });
}
