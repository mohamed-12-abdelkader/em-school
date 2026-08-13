import type { Request, Response } from 'express';
import * as schoolService from '../services/school.service';
import { HttpError } from '../utils';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

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
  const result = await schoolService.getSchoolForAdmin(schoolId);
  res.json(result);
}

export async function getSchoolAdmin(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const admin = await schoolService.getSchoolAdminForAdmin(schoolId);
  res.json({ admin });
}

export async function createSchool(req: Request, res: Response) {
  const body = req.body as {
    school: {
      name: string;
      description?: string;
      logo?: string;
      address?: string;
      contactPhone?: string;
    };
    admin: {
      email: string;
      password: string;
      name?: string;
    };
  };

  const result = await schoolService.createSchoolAccount({
    school: {
      name: body.school.name,
      description: body.school.description ?? null,
      logoUrl: body.school.logo ?? null,
      address: body.school.address ?? null,
      contactPhone: body.school.contactPhone ?? null,
    },
    admin: {
      email: body.admin.email,
      password: body.admin.password,
      name: body.admin.name,
    },
    logoFilePath: req.file?.path,
  });

  res.status(201).json(result);
}

export async function updateSchool(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const body = req.body as {
    name?: string;
    description?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    logo?: string;
  };

  if (!req.file && Object.keys(body).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  const school = await schoolService.updateSchoolForAdmin(schoolId, {
    name: body.name,
    description: body.description,
    address: body.address,
    contactPhone: body.contactPhone,
    logoUrl: body.logo,
    logoFilePath: req.file?.path,
  });
  res.json({ school });
}

export async function updateSchoolStatus(req: Request, res: Response) {
  const schoolId = parsePositiveIntParam(req.params.schoolId, 'schoolId');
  const { status } = req.body as {
    status: 'active' | 'suspended' | 'deleted';
  };
  const result = await schoolService.updateSchoolStatusForAdmin(schoolId, status);
  res.json(result);
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

export async function getSchoolPortalDashboard(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const result = await schoolService.getSchoolPortalDashboard(schoolId);
  res.json(result);
}

export async function getOwnSettings(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const school = await schoolService.getOwnSchoolSettings(schoolId);
  res.json(school);
}

export async function updateOwnSettings(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const body = req.body as {
    name?: string;
    description?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    logo?: string;
  };

  if (!req.file && Object.keys(body).length === 0) {
    throw new HttpError(400, 'At least one field is required');
  }

  const school = await schoolService.updateOwnSchoolSettings(schoolId, {
    name: body.name,
    description: body.description,
    address: body.address,
    contactPhone: body.contactPhone,
    logoUrl: body.logo,
    logoFilePath: req.file?.path,
  });
  res.json(school);
}
