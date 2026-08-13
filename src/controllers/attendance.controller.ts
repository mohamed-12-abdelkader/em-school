import type { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';
import * as studentModel from '../models/student.model';
import { HttpError } from '../utils';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

function parseOptionalPositiveInt(q: Record<string, unknown>, key: string): number | undefined {
  const raw = q[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  return parsePositiveIntParam(String(raw), key);
}

export async function scanAttendance(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const { qr_code } = req.body as { qr_code: string };
  const result = await attendanceService.recordScan(schoolId, qr_code);
  res.status(200).json(result);
}

export async function listAttendance(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const query = req.query as Record<string, unknown>;
  const hasPaging =
    query.limit !== undefined || query.skip !== undefined || query.page !== undefined;
  const { limit, skip } = hasPaging
    ? parsePagination(query)
    : { limit: 500, skip: 0 };

  const studentInternalId =
    parseOptionalPositiveInt(query, 'student_id') ?? parseOptionalPositiveInt(query, 'studentId');
  const classId =
    parseOptionalPositiveInt(query, 'class_id') ??
    parseOptionalPositiveInt(query, 'classroom_id') ??
    parseOptionalPositiveInt(query, 'classId') ??
    parseOptionalPositiveInt(query, 'classroomId');
  const date = typeof query.date === 'string' && query.date ? query.date : undefined;
  const from = typeof query.from === 'string' && query.from ? query.from : undefined;
  const to = typeof query.to === 'string' && query.to ? query.to : undefined;

  const result = await attendanceService.listSchoolAttendance(schoolId, {
    from,
    to,
    date,
    studentInternalId,
    classId,
    limit,
    skip,
  });
  res.json(result);
}

export async function listParentAttendance(req: Request, res: Response) {
  const parentUserId = req.user!.id;
  const query = req.query as Record<string, unknown>;
  const studentInternalId =
    parseOptionalPositiveInt(query, 'student_id') ?? parseOptionalPositiveInt(query, 'studentId');
  const from = typeof query.from === 'string' && query.from ? query.from : undefined;
  const to = typeof query.to === 'string' && query.to ? query.to : undefined;
  const result = await attendanceService.listParentAttendance(parentUserId, {
    studentInternalId,
    from,
    to,
  });
  res.json(result);
}

export async function getStudentAttendanceDays(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const studentInternalId = parsePositiveIntParam(req.params.studentId, 'studentId');
  const st = await studentModel.findByIdAndSchool(studentInternalId, schoolId);
  if (!st) throw new HttpError(404, 'Student not found');
  const q = req.query as Record<string, string | undefined>;
  const summary = await attendanceService.countPresentDaysForStudent(
    schoolId,
    studentInternalId,
    q.from,
    q.to,
  );
  res.json(summary);
}

export async function batchMark(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const body = req.body as {
    classroom_id: number;
    date: string;
    records: { studentId: number; status: 'present' | 'absent' }[];
  };
  const result = await attendanceService.markBatch(schoolId, {
    classroomId: body.classroom_id,
    date: body.date,
    records: body.records,
  });
  res.status(200).json(result);
}

export async function getReports(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const query = req.query as Record<string, unknown>;
  const classroomId =
    parseOptionalPositiveInt(query, 'classroom_id') ??
    parseOptionalPositiveInt(query, 'classroomId') ??
    parseOptionalPositiveInt(query, 'class_id') ??
    parseOptionalPositiveInt(query, 'classId');
  if (!classroomId) {
    throw new HttpError(400, 'classroom_id is required');
  }
  const from = typeof query.from === 'string' && query.from ? query.from : undefined;
  const to = typeof query.to === 'string' && query.to ? query.to : undefined;
  const result = await attendanceService.attendanceReports(schoolId, {
    classroomId,
    from,
    to,
  });
  res.json(result);
}
