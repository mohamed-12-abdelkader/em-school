import type { Request, Response } from 'express';
import { parsePagination } from '../utils/pagination';
import * as subjectService from '../services/subject.service';
import { parsePositiveIntParam } from '../utils/pagination';

export async function listSubjects(req: Request, res: Response) {
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = (req.query?.q as string | undefined) ?? undefined;
  const result = await subjectService.listSubjects({ limit, skip, q });
  res.json(result);
}

export async function getSubject(req: Request, res: Response) {
  const subjectId = parsePositiveIntParam(req.params.subjectId, 'subjectId');
  const subject = await subjectService.getSubject(subjectId);
  res.json({ subject });
}
