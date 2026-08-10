import type { Request, Response } from 'express';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import * as schoolTeacherService from '../services/schoolTeacher.service';
import type { TeacherStatus } from '../types/schoolSubjectsTeachers';
import { HttpError } from '../utils';

function parseOptionalStatus(q: Record<string, unknown>): TeacherStatus | undefined {
  const raw = q.status;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  if (raw !== 'active' && raw !== 'suspended') {
    throw new HttpError(400, 'status must be active|suspended');
  }
  return raw;
}

export async function listTeachers(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const query = req.query as Record<string, unknown>;
  const { limit, skip } = parsePagination(query);
  const q = typeof query.q === 'string' ? query.q : undefined;
  const status = parseOptionalStatus(query);

  const result = await schoolTeacherService.listTeachers(schoolId, { limit, skip, q, status });
  res.json(result);
}

export async function getTeacher(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  const result = await schoolTeacherService.getTeacher(teacherId, schoolId);
  res.json(result);
}

export async function createTeacher(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const body = req.body as Record<string, unknown>;

  const result = await schoolTeacherService.createTeacher(schoolId, {
    firstName: body.firstName as string | undefined,
    lastName: body.lastName as string | undefined,
    fullName: body.fullName as string | undefined,
    name: body.name as string | undefined,
    gender: body.gender as 'male' | 'female',
    phone: String(body.phone),
    hireDate: String(body.hireDate),
    email: (body.email as string | null | undefined) ?? null,
    nationalId: (body.nationalId as string | null | undefined) ?? null,
    address: (body.address as string | null | undefined) ?? null,
    photo: (body.photo as string | null | undefined) ?? null,
    specialization: (body.specialization as string | null | undefined) ?? null,
    status: body.status as TeacherStatus | undefined,
    description: (body.description as string | null | undefined) ?? null,
    subjectId: body.subjectId as number | undefined,
    password: body.password as string | undefined,
  });
  res.status(201).json(result);
}

export async function updateTeacher(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  const teacher = await schoolTeacherService.updateTeacher(schoolId, teacherId, req.body);
  res.json({ teacher });
}

export async function deleteTeacher(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  await schoolTeacherService.deleteTeacher(schoolId, teacherId);
  res.status(204).send();
}

export async function assignTeacherToClasses(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  const body = req.body as { classIds: number[] };
  await schoolTeacherService.assignTeacherToClasses(schoolId, teacherId, body.classIds);
  res.status(201).json({ message: 'Teacher assigned to classes successfully' });
}

export async function removeTeacherFromClass(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  await schoolTeacherService.removeTeacherFromClass(schoolId, teacherId, classId);
  res.status(204).send();
}

export async function listClassesByTeacher(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const teacherId = parsePositiveIntParam(req.params.teacherId, 'teacherId');
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const result = await schoolTeacherService.getClassesByTeacher(schoolId, teacherId, {
    limit,
    skip,
  });
  res.json(result);
}

export async function listTeachersByClass(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const result = await schoolTeacherService.getTeachersByClass(schoolId, classId, { limit, skip });
  res.json(result);
}
