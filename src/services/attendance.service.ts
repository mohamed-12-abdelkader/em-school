import dayjs from 'dayjs';
import * as attendanceModel from '../models/attendance.model';
import * as studentModel from '../models/student.model';
import * as schoolClassModel from '../models/schoolClass.model';
import * as whatsappService from './whatsapp.service';
import { parseStudentQrPayload } from '../utils/studentQr';
import { HttpError } from '../utils';
import type { AttendanceStatus } from '../types/attendance';

export async function recordScan(schoolId: number, rawQr: string) {
  let payload: { schoolId: number; studentId: string };
  try {
    payload = parseStudentQrPayload(rawQr);
  } catch {
    throw new HttpError(400, 'رمز QR غير صالح');
  }

  if (payload.schoolId !== schoolId) {
    throw new HttpError(403, 'هذا الرمز لا يخص مدرستك');
  }

  const student = await studentModel.findBySchoolAndPublicStudentId(schoolId, payload.studentId);
  if (!student) {
    throw new HttpError(404, 'الطالب غير موجود');
  }

  const dateStr = dayjs().format('YYYY-MM-DD');
  const timeStr = dayjs().format('HH:mm:ss');

  const existing = await attendanceModel.findBySchoolStudentDate(schoolId, student.id, dateStr);
  if (existing) {
    throw new HttpError(409, 'Already marked today');
  }

  try {
    const row = await attendanceModel.insertAttendance({
      schoolId,
      studentInternalId: student.id,
      studentPublicId: student.student_id,
      date: dateStr,
      time: timeStr,
      status: 'present',
    });
    return {
      studentId: student.id,
      date: row.attendance_date,
      status: 'present' as const,
    };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Already marked today');
    }
    throw e;
  }
}

export async function listSchoolAttendance(
  schoolId: number,
  options: {
    from?: string;
    to?: string;
    date?: string;
    studentInternalId?: number;
    classId?: number;
    limit: number;
    skip: number;
  },
) {
  const [rows, total] = await Promise.all([
    attendanceModel.listBySchool(schoolId, options),
    attendanceModel.countBySchool(schoolId, options),
  ]);
  return {
    data: rows.map((r) => ({
      studentId: r.student_internal_id,
      date: r.attendance_date,
      status: r.status,
    })),
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + rows.length < total,
    },
  };
}

export async function listParentAttendance(
  parentUserId: number,
  options: {
    studentInternalId?: number;
    from?: string;
    to?: string;
  },
) {
  const rows = await attendanceModel.listChildrenAttendanceForParent(parentUserId, options);
  const byStudent = new Map<
    number,
    { studentId: number; records: { date: string; status: string }[] }
  >();

  for (const row of rows) {
    let child = byStudent.get(row.student_id);
    if (!child) {
      child = { studentId: row.student_id, records: [] };
      byStudent.set(row.student_id, child);
    }
    if (row.date && row.status) {
      child.records.push({ date: row.date, status: row.status });
    }
  }

  return { children: [...byStudent.values()] };
}

export async function countPresentDaysForStudent(
  schoolId: number,
  studentInternalId: number,
  from?: string,
  to?: string,
) {
  const days = await attendanceModel.countPresentDaysForStudent(schoolId, studentInternalId, {
    from,
    to,
  });
  return {
    student_internal_id: studentInternalId,
    present_days: days,
    from: from ?? null,
    to: to ?? null,
  };
}

export async function markBatch(
  schoolId: number,
  input: {
    classroomId: number;
    date: string;
    records: { studentId: number; status: 'present' | 'absent' }[];
  },
) {
  const classroom = await schoolClassModel.findByIdAndSchool(input.classroomId, schoolId);
  if (!classroom) {
    throw new HttpError(404, 'Classroom not found');
  }

  const timeStr = dayjs().format('HH:mm:ss');
  let marked = 0;

  for (const rec of input.records) {
    const student = await studentModel.findByIdAndSchool(rec.studentId, schoolId);
    if (!student || student.class_id !== input.classroomId) {
      throw new HttpError(400, `Student ${rec.studentId} is not in this classroom`);
    }

    const { previousStatus } = await attendanceModel.upsertStatus({
      schoolId,
      studentInternalId: student.id,
      studentPublicId: student.student_id,
      date: input.date,
      time: timeStr,
      status: rec.status as AttendanceStatus,
    });
    marked += 1;

    if (rec.status === 'absent' && previousStatus !== 'absent') {
      await whatsappService.notifyStudentAbsent({
        schoolId,
        studentId: student.id,
        studentName: student.full_name,
        date: input.date,
      });
    }
  }

  return { marked };
}

export async function attendanceReports(
  schoolId: number,
  options: { classroomId: number; from?: string; to?: string },
) {
  const classroom = await schoolClassModel.findByIdAndSchool(options.classroomId, schoolId);
  if (!classroom) {
    throw new HttpError(404, 'Classroom not found');
  }

  const rows = await attendanceModel.presentPercentByClassroom(schoolId, options.classroomId, {
    from: options.from,
    to: options.to,
  });

  return {
    data: rows.map((r) => ({
      studentId: r.student_id,
      presentPercent: Number(r.present_percent),
    })),
  };
}
