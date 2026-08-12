import pool from '../db/pool';
import type { AttendanceRow, AttendanceStatus } from '../types/attendance';

export async function findBySchoolStudentDate(
  schoolId: number,
  studentInternalId: number,
  date: string,
): Promise<AttendanceRow | null> {
  const r = await pool.query<AttendanceRow>(
    `SELECT id, school_id, student_internal_id, student_id,
            attendance_date::text, attendance_time::text, status, created_at
     FROM student_attendance
     WHERE school_id = $1 AND student_internal_id = $2 AND attendance_date = $3::date`,
    [schoolId, studentInternalId, date],
  );
  return r.rows[0] ?? null;
}

export async function upsertPresent(input: {
  schoolId: number;
  studentInternalId: number;
  studentPublicId: string;
  date: string;
  time: string;
  status?: AttendanceStatus;
}): Promise<{ row: AttendanceRow; isNew: boolean }> {
  const existing = await findBySchoolStudentDate(
    input.schoolId,
    input.studentInternalId,
    input.date,
  );
  const status = input.status ?? 'present';
  if (existing) {
    const r = await pool.query<AttendanceRow>(
      `UPDATE student_attendance
       SET attendance_time = $1::time, status = $2, student_id = $3
       WHERE id = $4
       RETURNING id, school_id, student_internal_id, student_id,
                 attendance_date::text, attendance_time::text, status, created_at`,
      [input.time, status, input.studentPublicId, existing.id],
    );
    const row = r.rows[0];
    if (!row) throw new Error('update attendance failed');
    return { row, isNew: false };
  }

  const r = await pool.query<AttendanceRow>(
    `INSERT INTO student_attendance (
       school_id, student_internal_id, student_id, attendance_date, attendance_time, status
     )
     VALUES ($1, $2, $3, $4::date, $5::time, $6)
     RETURNING id, school_id, student_internal_id, student_id,
               attendance_date::text, attendance_time::text, status, created_at`,
    [
      input.schoolId,
      input.studentInternalId,
      input.studentPublicId,
      input.date,
      input.time,
      status,
    ],
  );
  const row = r.rows[0];
  if (!row) throw new Error('insert attendance failed');
  return { row, isNew: true };
}

export async function listBySchool(
  schoolId: number,
  options: { from?: string; to?: string; studentInternalId?: number; limit: number; skip: number },
): Promise<AttendanceRow[]> {
  const params: unknown[] = [schoolId];
  let p = 2;
  const parts = ['a.school_id = $1'];
  if (options.from) {
    parts.push(`a.attendance_date >= $${p++}::date`);
    params.push(options.from);
  }
  if (options.to) {
    parts.push(`a.attendance_date <= $${p++}::date`);
    params.push(options.to);
  }
  if (options.studentInternalId !== undefined) {
    parts.push(`a.student_internal_id = $${p++}`);
    params.push(options.studentInternalId);
  }
  const lim = p++;
  const off = p++;
  params.push(options.limit, options.skip);
  const r = await pool.query<AttendanceRow>(
    `SELECT a.id, a.school_id, a.student_internal_id, a.student_id,
            a.attendance_date::text, a.attendance_time::text, a.status, a.created_at
     FROM student_attendance a
     WHERE ${parts.join(' AND ')}
     ORDER BY a.attendance_date DESC, a.attendance_time DESC
     LIMIT $${lim} OFFSET $${off}`,
    params,
  );
  return r.rows;
}

export async function countBySchool(
  schoolId: number,
  options: { from?: string; to?: string; studentInternalId?: number },
): Promise<number> {
  const params: unknown[] = [schoolId];
  let p = 2;
  const parts = ['school_id = $1'];
  if (options.from) {
    parts.push(`attendance_date >= $${p++}::date`);
    params.push(options.from);
  }
  if (options.to) {
    parts.push(`attendance_date <= $${p++}::date`);
    params.push(options.to);
  }
  if (options.studentInternalId !== undefined) {
    parts.push(`student_internal_id = $${p++}`);
    params.push(options.studentInternalId);
  }
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM student_attendance WHERE ${parts.join(' AND ')}`,
    params,
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listForParentUser(
  parentUserId: number,
  options: { studentInternalId?: number; from?: string; to?: string; limit: number; skip: number },
): Promise<
  Array<
    AttendanceRow & {
      student_full_name: string;
      grade: string | null;
    }
  >
> {
  const params: unknown[] = [parentUserId];
  let p = 2;
  const parts = ['p.user_id = $1'];
  if (options.studentInternalId !== undefined) {
    parts.push(`s.id = $${p++}`);
    params.push(options.studentInternalId);
  }
  if (options.from) {
    parts.push(`a.attendance_date >= $${p++}::date`);
    params.push(options.from);
  }
  if (options.to) {
    parts.push(`a.attendance_date <= $${p++}::date`);
    params.push(options.to);
  }
  const lim = p++;
  const off = p++;
  params.push(options.limit, options.skip);
  const r = await pool.query<AttendanceRow & { student_full_name: string; grade: string | null }>(
    `SELECT a.id, a.school_id, a.student_internal_id, a.student_id,
            a.attendance_date::text, a.attendance_time::text, a.status, a.created_at,
            s.full_name AS student_full_name, s.grade
     FROM student_attendance a
     JOIN students s ON s.id = a.student_internal_id AND s.school_id = a.school_id AND s.deleted_at IS NULL
     JOIN parent_students ps ON ps.student_id = s.id
     JOIN parents p ON p.id = ps.parent_id AND p.school_id = s.school_id
     WHERE ${parts.join(' AND ')}
     ORDER BY a.attendance_date DESC, a.attendance_time DESC
     LIMIT $${lim} OFFSET $${off}`,
    params,
  );
  return r.rows;
}

export async function countForParentUser(
  parentUserId: number,
  options: { studentInternalId?: number; from?: string; to?: string },
): Promise<number> {
  const params: unknown[] = [parentUserId];
  let p = 2;
  const parts = ['p.user_id = $1'];
  if (options.studentInternalId !== undefined) {
    parts.push(`s.id = $${p++}`);
    params.push(options.studentInternalId);
  }
  if (options.from) {
    parts.push(`a.attendance_date >= $${p++}::date`);
    params.push(options.from);
  }
  if (options.to) {
    parts.push(`a.attendance_date <= $${p++}::date`);
    params.push(options.to);
  }
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM student_attendance a
     JOIN students s ON s.id = a.student_internal_id AND s.school_id = a.school_id AND s.deleted_at IS NULL
     JOIN parent_students ps ON ps.student_id = s.id
     JOIN parents p ON p.id = ps.parent_id AND p.school_id = s.school_id
     WHERE ${parts.join(' AND ')}`,
    params,
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function countPresentDaysForStudent(
  schoolId: number,
  studentInternalId: number,
  options: { from?: string; to?: string },
): Promise<number> {
  const params: unknown[] = [schoolId, studentInternalId];
  let p = 3;
  const parts = ['school_id = $1', 'student_internal_id = $2', `status = 'present'`];
  if (options.from) {
    parts.push(`attendance_date >= $${p++}::date`);
    params.push(options.from);
  }
  if (options.to) {
    parts.push(`attendance_date <= $${p++}::date`);
    params.push(options.to);
  }
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM student_attendance WHERE ${parts.join(' AND ')}`,
    params,
  );
  return Number(r.rows[0]?.c ?? 0);
}
