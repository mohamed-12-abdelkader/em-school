import type { Request, Response } from 'express';
import * as studentService from '../services/student.service';
import type { StudentStatus } from '../types/studentAffairs';
import { buildStudentQrPayload, qrPayloadToPngDataUrl } from '../utils/studentQr';
import { HttpError } from '../utils';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

function parseOptionalPositiveInt(q: Record<string, unknown>, key: string): number | undefined {
  const raw = q[key];
  if (raw === undefined || raw === '') return undefined;
  return parsePositiveIntParam(String(raw), key);
}

function parseOptionalQ(q: Record<string, unknown>): string | undefined {
  const raw = q.q;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim();
}

function parseOptionalStatus(q: Record<string, unknown>): StudentStatus | undefined {
  const raw = q.status;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const allowed: StudentStatus[] = ['active', 'suspended', 'graduated', 'transferred'];
  if (!allowed.includes(raw as StudentStatus)) {
    throw new HttpError(400, 'status must be active|suspended|graduated|transferred');
  }
  return raw as StudentStatus;
}

function parseOptionalString(q: Record<string, unknown>, key: string): string | undefined {
  const raw = q[key];
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim();
}

export async function listStudents(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const query = req.query as Record<string, unknown>;
  const { limit, skip } = parsePagination(query);
  const classId =
    parseOptionalPositiveInt(query, 'classroomId') ?? parseOptionalPositiveInt(query, 'classId');
  const gradeId = parseOptionalPositiveInt(query, 'gradeId');
  const academicYearId = parseOptionalPositiveInt(query, 'academicYearId');
  const status = parseOptionalStatus(query);
  const studentCode = parseOptionalString(query, 'studentCode');
  const q = parseOptionalQ(query);

  const result = await studentService.listStudents(schoolId, {
    limit,
    skip,
    classId,
    gradeId,
    academicYearId,
    status,
    studentCode,
    q,
  });
  res.json(result);
}

export async function createStudent(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const files = req.files as Record<string, Express.Multer.File[] | undefined> | undefined;
  const avatar = files?.avatar?.[0];
  const birthCertificate = files?.birthCertificate?.[0];

  const body = req.body as Record<string, unknown>;

  const result = await studentService.createStudent(schoolId, {
    firstName: body.firstName as string | undefined,
    lastName: body.lastName as string | undefined,
    fullName: body.fullName as string | undefined,
    gender: body.gender as 'male' | 'female' | undefined,
    birthDate: body.birthDate as string | undefined,
    dateOfBirth: body.dateOfBirth as string | undefined,
    nationalId: (body.nationalId as string | null | undefined) ?? null,
    address: (body.address as string | null | undefined) ?? null,
    studentPhone: (body.studentPhone as string | null | undefined) ?? null,
    phone: (body.phone as string | null | undefined) ?? null,
    academicYearId: body.academicYearId as number | undefined,
    gradeId: body.gradeId as number,
    classroomId: body.classroomId as number | undefined,
    classId: body.classId as number | undefined,
    parentName: body.parentName as string | undefined,
    parentFullName: body.parentFullName as string | undefined,
    parentPhone: String(body.parentPhone),
    parentEmail: (body.parentEmail as string | null | undefined) ?? null,
    relationship: body.relationship as 'father' | 'mother' | 'guardian' | 'other' | undefined,
    parentRelation: body.parentRelation as 'father' | 'mother' | 'other' | undefined,
    status: body.status as 'active' | 'suspended' | 'graduated' | 'transferred' | undefined,
    password: body.password as string | undefined,
    avatarLocalPath: avatar?.path,
    birthCertificateLocalPath: birthCertificate?.path,
  });
  res.status(201).json(result);
}

export async function getStudent(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const result = await studentService.getStudent(studentId, schoolId);
  res.json(result);
}

/** صورة QR جاهزة للطباعة/التحميل (Data URL) + الحمولة النصية */
export async function getStudentQr(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const result = await studentService.getStudent(studentId, schoolId);
  const publicId = result.student.studentCode;
  const payload = result.qr?.payload?.trim() || buildStudentQrPayload(schoolId, publicId);
  const qrDataUrl = await qrPayloadToPngDataUrl(payload);
  const format = String(req.query.format ?? 'json');
  if (format === 'png') {
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${publicId}.png"`);
    res.send(buf);
    return;
  }
  res.json({
    qrDataUrl,
    qrPayload: payload,
    student: {
      studentCode: publicId,
      student_id: publicId,
      name: result.student.fullName,
      grade: result.grade?.name ?? result.student.gradeLabel,
    },
  });
}

export async function updateStudent(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const student = await studentService.updateStudent(studentId, schoolId, req.body);
  res.json({ student });
}

export async function deleteStudent(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentId = parsePositiveIntParam(req.params.studentId, 'studentId');
  await studentService.deleteStudent(studentId, schoolId);
  res.status(204).send();
}
