import dayjs from 'dayjs';
import * as attendanceModel from '../models/attendance.model';
import * as studentModel from '../models/student.model';
import { parseStudentQrPayload } from '../utils/studentQr';
import { HttpError } from '../utils';

export async function recordScan(schoolUserId: number, rawQr: string) {
  let payload: { schoolId: number; studentId: string };
  try {
    payload = parseStudentQrPayload(rawQr);
  } catch {
    throw new HttpError(400, 'رمز QR غير صالح');
  }

  if (payload.schoolId !== schoolUserId) {
    throw new HttpError(403, 'هذا الرمز لا يخص مدرستك');
  }

  const student = await studentModel.findBySchoolAndPublicStudentId(
    schoolUserId,
    payload.studentId,
  );
  if (!student) {
    throw new HttpError(404, 'الطالب غير موجود');
  }

  const dateStr = dayjs().format('YYYY-MM-DD');
  const timeStr = dayjs().format('HH:mm:ss');

  const { row, isNew } = await attendanceModel.upsertPresent({
    schoolId: schoolUserId,
    studentInternalId: student.id,
    studentPublicId: student.student_id,
    date: dateStr,
    time: timeStr,
    status: 'present',
  });

  return {
    attendance: {
      id: row.id,
      student_id: row.student_id,
      student_name: student.full_name,
      date: row.attendance_date,
      time: row.attendance_time,
      status: row.status,
    },
    alreadyCheckedInToday: !isNew,
  };
}

export async function listSchoolAttendance(
  schoolId: number,
  options: {
    from?: string;
    to?: string;
    studentInternalId?: number;
    limit: number;
    skip: number;
  },
) {
  const [rows, total] = await Promise.all([
    attendanceModel.listBySchool(schoolId, options),
    attendanceModel.countBySchool(schoolId, options),
  ]);
  return {
    records: rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_internal_id: r.student_internal_id,
      date: r.attendance_date,
      time: r.attendance_time,
      status: r.status,
      created_at: r.created_at,
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
    limit: number;
    skip: number;
  },
) {
  const [rows, total] = await Promise.all([
    attendanceModel.listForParentUser(parentUserId, options),
    attendanceModel.countForParentUser(parentUserId, {
      studentInternalId: options.studentInternalId,
      from: options.from,
      to: options.to,
    }),
  ]);

  return {
    records: rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_internal_id: r.student_internal_id,
      student_name: r.student_full_name,
      grade: r.grade,
      date: r.attendance_date,
      time: r.attendance_time,
      status: r.status,
      created_at: r.created_at,
    })),
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + rows.length < total,
    },
  };
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
