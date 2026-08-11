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

  const { name, description, email, password, address, contactPhone } = req.body as {
    name: string;
    description?: string;
    email: string;
    password: string;
    address?: string;
    contactPhone?: string;
  };

  const school = await schoolService.createSchoolAccount({
    name,
    description: description ?? null,
    email,
    password,
    logoFilePath: req.file.path,
    address: address ?? null,
    contactPhone: contactPhone ?? null,
  });

  res.status(201).json({ school });
}

export async function updateSchool(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const body = req.body as {
    name?: string;
    description?: string | null;
    email?: string;
    address?: string | null;
    contactPhone?: string | null;
  };

  if (!req.file && Object.keys(body).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  const school = await schoolService.updateSchoolForAdmin(schoolId, {
    ...body,
    logoFilePath: req.file?.path,
  });
  res.json({ school });
}

export async function updateSchoolStatus(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const { action } = req.body as {
    action: 'activate' | 'suspend' | 'soft-delete';
  };
  const school = await schoolService.updateSchoolStatusForAdmin(schoolId, action);
  res.json({ school });
}

export async function createRegistrationCode(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const result = await schoolService.ensureRegistrationCode(schoolId);
  res.status(result.created ? 201 : 200).json({ registrationCode: result.registrationCode });
}

export async function regenerateRegistrationCode(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const registrationCode = await schoolService.regenerateRegistrationCode(schoolId);
  res.status(201).json({ registrationCode });
}

export async function getDashboard(_req: Request, res: Response) {
  const result = await schoolService.getAdminDashboard();
  res.json(result);
}
