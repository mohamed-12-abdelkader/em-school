import type { Request, Response } from 'express';
import * as schoolService from '../services/school.service';
import { HttpError } from '../utils';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';

function parseOptionalQ(q: Record<string, unknown>): string | undefined {
  const raw = q.q;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim();
}

export async function listSchools(req: Request, res: Response) {
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = parseOptionalQ(req.query as Record<string, unknown>);
  const result = await schoolService.listSchoolsForAdmin({ limit, skip, q });
  res.json(result);
}

export async function getSchool(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const school = await schoolService.getSchoolForAdmin(schoolId);
  res.json({ school });
}

export async function createSchool(req: Request, res: Response) {
  if (!req.file) {
    throw new HttpError(400, 'Logo file is required (field name: logo)');
  }

  const { name, description, email, password } = req.body as {
    name: string;
    description?: string;
    email: string;
    password: string;
  };

  const school = await schoolService.createSchoolAccount({
    name,
    description: description ?? null,
    email,
    password,
    logoFilePath: req.file.path,
  });

  res.status(201).json({ school });
}
