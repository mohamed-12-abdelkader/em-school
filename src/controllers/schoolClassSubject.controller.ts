import type { Request, Response } from 'express';
import * as classSubjectService from '../services/schoolClassSubject.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

export async function listClassSubjects(req: Request, res: Response) {
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolId = getAuthSchoolId(req);
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
  const schoolId = getAuthSchoolId(req);

  const body = req.body as { subjectIds: number[] };
  await classSubjectService.addSubjectsToClass({ schoolId, classId, subjectIds: body.subjectIds });

  res.status(201).json({ message: 'Subjects added to class successfully' });
}

export async function replaceSubjectsForClass(req: Request, res: Response) {
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const schoolId = getAuthSchoolId(req);

  const body = req.body as { subjectIds: number[] };
  await classSubjectService.replaceClassSubjects({
    schoolId,
    classId,
    subjectIds: body.subjectIds,
  });

  res.json({ message: 'Class subjects updated successfully' });
}
