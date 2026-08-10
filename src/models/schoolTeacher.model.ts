import pool from '../db/pool';
import type { SchoolTeacherRow, TeacherStatus } from '../types/schoolSubjectsTeachers';

const TEACHER_COLUMNS = `
  id, school_id, user_id, employee_code, first_name, last_name, full_name,
  photo, gender, phone, email, national_id, address, hire_date::text,
  specialization, status, name, description, subject_id, deleted_at, created_at, updated_at
`;

export async function allocateEmployeeCode(): Promise<string> {
  const r = await pool.query<{ last_value: number }>(
    `UPDATE teacher_code_global_sequence
     SET last_value = last_value + 1
     WHERE id = 1
     RETURNING last_value`,
  );
  const seq = r.rows[0]?.last_value ?? 1;
  return `TCH-${String(seq).padStart(6, '0')}`;
}

export async function findByIdAndSchool(
  teacherId: number,
  schoolId: number,
  options: { includeDeleted?: boolean } = {},
): Promise<SchoolTeacherRow | null> {
  const deletedClause = options.includeDeleted ? '' : 'AND deleted_at IS NULL';
  const res = await pool.query<SchoolTeacherRow>(
    `SELECT ${TEACHER_COLUMNS}
     FROM school_teachers
     WHERE id = $1 AND school_id = $2 ${deletedClause}`,
    [teacherId, schoolId],
  );
  return res.rows[0] ?? null;
}

export async function findByUserId(userId: number): Promise<SchoolTeacherRow | null> {
  const res = await pool.query<SchoolTeacherRow>(
    `SELECT ${TEACHER_COLUMNS}
     FROM school_teachers
     WHERE user_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export interface TeacherListFilters {
  q?: string;
  status?: TeacherStatus;
}

function buildWhere(schoolId: number, filters: TeacherListFilters) {
  const values: unknown[] = [schoolId];
  let where = `WHERE school_id = $1 AND deleted_at IS NULL`;
  if (filters.status) {
    values.push(filters.status);
    where += ` AND status = $${values.length}::teacher_status`;
  }
  if (filters.q?.trim()) {
    values.push(`%${filters.q.trim()}%`);
    where += ` AND (
      full_name ILIKE $${values.length}
      OR first_name ILIKE $${values.length}
      OR last_name ILIKE $${values.length}
      OR employee_code ILIKE $${values.length}
      OR COALESCE(phone, '') ILIKE $${values.length}
      OR COALESCE(email, '') ILIKE $${values.length}
      OR COALESCE(national_id, '') ILIKE $${values.length}
      OR COALESCE(specialization, '') ILIKE $${values.length}
    )`;
  }
  return { where, values };
}

export async function countBySchool(
  schoolId: number,
  filters: TeacherListFilters,
): Promise<number> {
  const { where, values } = buildWhere(schoolId, filters);
  const totalRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM school_teachers ${where}`,
    values,
  );
  return totalRes.rows[0]?.total ?? 0;
}

export async function listBySchool(
  schoolId: number,
  options: { limit: number; skip: number } & TeacherListFilters,
): Promise<SchoolTeacherRow[]> {
  const { limit, skip, ...filters } = options;
  const { where, values } = buildWhere(schoolId, filters);
  const rowsRes = await pool.query<SchoolTeacherRow>(
    `SELECT ${TEACHER_COLUMNS}
     FROM school_teachers
     ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, skip],
  );
  return rowsRes.rows;
}

export async function create(input: {
  schoolId: number;
  userId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  photo?: string | null;
  gender: 'male' | 'female';
  phone: string;
  email?: string | null;
  nationalId?: string | null;
  address?: string | null;
  hireDate: string;
  specialization?: string | null;
  status?: TeacherStatus;
  description?: string | null;
  subjectId?: number | null;
}): Promise<SchoolTeacherRow> {
  const res = await pool.query<SchoolTeacherRow>(
    `INSERT INTO school_teachers (
       school_id, user_id, employee_code, first_name, last_name, full_name,
       photo, gender, phone, email, national_id, address, hire_date,
       specialization, status, name, description, subject_id, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12, $13::date,
       $14, $15::teacher_status, $6, $16, $17, NOW()
     )
     RETURNING ${TEACHER_COLUMNS}`,
    [
      input.schoolId,
      input.userId,
      input.employeeCode,
      input.firstName,
      input.lastName,
      input.fullName,
      input.photo ?? null,
      input.gender,
      input.phone,
      input.email ?? null,
      input.nationalId ?? null,
      input.address ?? null,
      input.hireDate,
      input.specialization ?? null,
      input.status ?? 'active',
      input.description ?? null,
      input.subjectId ?? null,
    ],
  );
  return res.rows[0]!;
}

export async function update(
  teacherId: number,
  schoolId: number,
  patch: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    photo?: string | null;
    gender?: 'male' | 'female';
    phone?: string;
    email?: string | null;
    nationalId?: string | null;
    address?: string | null;
    hireDate?: string;
    specialization?: string | null;
    status?: TeacherStatus;
    description?: string | null;
    subjectId?: number | null;
  },
): Promise<SchoolTeacherRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  const map: Array<[keyof typeof patch, string, string?]> = [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['fullName', 'full_name'],
    ['photo', 'photo'],
    ['gender', 'gender'],
    ['phone', 'phone'],
    ['email', 'email'],
    ['nationalId', 'national_id'],
    ['address', 'address'],
    ['hireDate', 'hire_date', '::date'],
    ['specialization', 'specialization'],
    ['status', 'status', '::teacher_status'],
    ['description', 'description'],
    ['subjectId', 'subject_id'],
  ];

  for (const [key, col, cast] of map) {
    if (patch[key] !== undefined) {
      sets.push(`${col} = $${p++}${cast ?? ''}`);
      vals.push(patch[key]);
    }
  }

  if (patch.fullName !== undefined) {
    sets.push(`name = $${p}`);
    vals.push(patch.fullName);
    p += 1;
  }

  if (!sets.length) return findByIdAndSchool(teacherId, schoolId);

  sets.push(`updated_at = NOW()`);
  vals.push(teacherId, schoolId);

  const res = await pool.query<SchoolTeacherRow>(
    `UPDATE school_teachers
     SET ${sets.join(', ')}
     WHERE id = $${p} AND school_id = $${p + 1} AND deleted_at IS NULL
     RETURNING ${TEACHER_COLUMNS}`,
    vals,
  );
  return res.rows[0] ?? null;
}

export async function softDelete(teacherId: number, schoolId: number): Promise<number | null> {
  const res = await pool.query<{ user_id: number | null }>(
    `UPDATE school_teachers
     SET deleted_at = NOW(), updated_at = NOW(), status = 'suspended'
     WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
     RETURNING user_id`,
    [teacherId, schoolId],
  );
  return res.rows.length ? (res.rows[0]?.user_id ?? null) : null;
}

export async function remove(teacherId: number, schoolId: number): Promise<boolean> {
  const res = await pool.query(`DELETE FROM school_teachers WHERE id = $1 AND school_id = $2`, [
    teacherId,
    schoolId,
  ]);
  return Boolean(res.rowCount && res.rowCount > 0);
}
