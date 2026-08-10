import type { Request, Response } from 'express';
import * as attendanceService from '../services/attendance.service';
import * as studentModel from '../models/student.model';
import { HttpError } from '../utils';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';

export async function scanAttendance(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const { raw } = req.body as { raw: string };
  const result = await attendanceService.recordScan(schoolId, raw);
  res.status(201).json(result);
}

export async function listAttendance(req: Request, res: Response) {
  const schoolId = req.user!.id;
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string | undefined>;
  let studentInternalId: number | undefined;
  if (q.studentId !== undefined && q.studentId !== '') {
    studentInternalId = parsePositiveIntParam(q.studentId, 'studentId');
  }
  const result = await attendanceService.listSchoolAttendance(schoolId, {
    from: q.from,
    to: q.to,
    studentInternalId,
    limit,
    skip,
  });
  res.json(result);
}

export async function listParentAttendance(req: Request, res: Response) {
  const parentUserId = req.user!.id;
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string | undefined>;
  let studentInternalId: number | undefined;
  if (q.studentId !== undefined && q.studentId !== '') {
    studentInternalId = parsePositiveIntParam(q.studentId, 'studentId');
  }
  const result = await attendanceService.listParentAttendance(parentUserId, {
    studentInternalId,
    from: q.from,
    to: q.to,
    limit,
    skip,
  });
  res.json(result);
}

export async function getStudentAttendanceDays(req: Request, res: Response) {
  const schoolId = req.user!.id;
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
