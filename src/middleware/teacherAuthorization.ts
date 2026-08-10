import type { RequestHandler } from 'express';
import * as teacherModel from '../models/schoolTeacher.model';
import * as assignmentModel from '../models/teacherAssignment.model';
import { HttpError } from '../utils';

export async function resolveTeacherFromUser(userId: number) {
  const teacher = await teacherModel.findByUserId(userId);
  if (!teacher) return null;
  return teacher;
}

export async function assertTeacherCanAccess(input: {
  teacherId: number;
  schoolId: number;
  classroomId: number;
  subjectId: number;
  academicYearId?: number;
}) {
  const ok = await assignmentModel.hasActiveAssignment({
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    classroomId: input.classroomId,
    subjectId: input.subjectId,
    academicYearId: input.academicYearId,
  });
  if (!ok) {
    throw new HttpError(403, 'غير مسموح: المادة/الفصل غير مسندة لهذا المدرس');
  }
}

/** يحمّل سجل المدرس من JWT ويضعه في req.teacher */
export function teacherAuthMiddleware(): RequestHandler {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden: teacher role required' });
    }
    const teacher = await resolveTeacherFromUser(req.user.id);
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher profile not found or inactive' });
    }
    req.teacher = {
      id: teacher.id,
      schoolId: teacher.school_id,
      employeeCode: teacher.employee_code,
      fullName: teacher.full_name,
      userId: teacher.user_id!,
    };
    next();
  };
}
