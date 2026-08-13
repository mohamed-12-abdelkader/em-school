import pool from '../db/pool';
import type {
  StudentDetailRelations,
  StudentRelationship,
  StudentRow,
  StudentStatus,
} from '../types/studentAffairs';

export interface StudentListFilters {
  classId?: number;
  gradeId?: number;
  academicYearId?: number;
  status?: StudentStatus;
  studentCode?: string;
  q?: string;
  includeDeleted?: boolean;
}

const STUDENT_COLUMNS = `
  s.id, s.school_id, s.academic_year_id, s.grade_id, s.class_id,
  s.student_code, s.student_id, s.first_name, s.last_name, s.full_name,
  s.gender, s.date_of_birth::text, s.national_id, s.avatar_url, s.address,
  s.parent_name, s.parent_phone, s.parent_email, s.relationship,
  s.phone, s.status, s.grade, s.student_login_code, s.parent_login_code, s.qr_code,
  s.email, s.user_id, s.deleted_at, s.created_at, s.updated_at
`;

function buildWhere(
  schoolId: number,
  filters: StudentListFilters,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [schoolId];
  let p = 2;
  const parts = [`s.school_id = $1`];

  if (!filters.includeDeleted) {
    parts.push(`s.deleted_at IS NULL`);
  }

  if (filters.classId !== undefined) {
    parts.push(`s.class_id = $${p++}`);
    params.push(filters.classId);
  }

  if (filters.gradeId !== undefined) {
    parts.push(`s.grade_id = $${p++}`);
    params.push(filters.gradeId);
  }

  if (filters.academicYearId !== undefined) {
    parts.push(`s.academic_year_id = $${p++}`);
    params.push(filters.academicYearId);
  }

  if (filters.status !== undefined) {
    parts.push(`s.status = $${p++}`);
    params.push(filters.status);
  }

  if (filters.studentCode && filters.studentCode.trim()) {
    parts.push(`s.student_code ILIKE $${p++}`);
    params.push(`%${filters.studentCode.trim()}%`);
  }

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    parts.push(
      `(s.full_name ILIKE $${p} OR s.first_name ILIKE $${p} OR s.last_name ILIKE $${p}
        OR COALESCE(s.national_id, '') ILIKE $${p}
        OR COALESCE(s.student_code, '') ILIKE $${p}
        OR COALESCE(s.student_id, '') ILIKE $${p}
        OR COALESCE(s.phone, '') ILIKE $${p}
        OR COALESCE(s.parent_phone, '') ILIKE $${p}
        OR COALESCE(s.parent_name, '') ILIKE $${p})`,
    );
    params.push(term);
    p += 1;
  }

  return { clause: parts.join(' AND '), params };
}

export async function countBySchool(
  schoolId: number,
  filters: StudentListFilters,
): Promise<number> {
  const { clause, params } = buildWhere(schoolId, filters);
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM students s WHERE ${clause}`,
    params,
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listBySchool(
  schoolId: number,
  limit: number,
  skip: number,
  filters: StudentListFilters,
): Promise<StudentRow[]> {
  const { clause, params } = buildWhere(schoolId, filters);
  const r = await pool.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS}
     FROM students s
     WHERE ${clause}
     ORDER BY s.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, skip],
  );
  return r.rows;
}

export async function findByIdAndSchool(
  studentId: number,
  schoolId: number,
  options: { includeDeleted?: boolean } = {},
): Promise<StudentRow | null> {
  const deletedClause = options.includeDeleted ? '' : 'AND s.deleted_at IS NULL';
  const r = await pool.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS}
     FROM students s
     WHERE s.id = $1 AND s.school_id = $2 ${deletedClause}`,
    [studentId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function findDetailByIdAndSchool(
  studentId: number,
  schoolId: number,
): Promise<{ student: StudentRow; relations: StudentDetailRelations } | null> {
  const r = await pool.query<
    StudentRow & {
      ay_id: number | null;
      ay_name: string | null;
      ay_start: string | null;
      ay_end: string | null;
      ay_current: boolean | null;
      g_id: number | null;
      g_name: string | null;
      g_stage: string | null;
      c_id: number | null;
      c_name: string | null;
      c_capacity: number | null;
      parent_whatsapp: string | null;
    }
  >(
    `SELECT ${STUDENT_COLUMNS},
            ay.id AS ay_id, ay.name AS ay_name, ay.start_date::text AS ay_start,
            ay.end_date::text AS ay_end, ay.is_current AS ay_current,
            g.id AS g_id, g.name AS g_name, g.stage::text AS g_stage,
            c.id AS c_id, c.name AS c_name, c.capacity AS c_capacity,
            p.whatsapp_number AS parent_whatsapp
     FROM students s
     LEFT JOIN academic_years ay ON ay.id = s.academic_year_id AND ay.school_id = s.school_id
     LEFT JOIN school_grades g ON g.id = s.grade_id AND g.school_id = s.school_id
     LEFT JOIN school_classes c ON c.id = s.class_id
     LEFT JOIN parent_students ps ON ps.student_id = s.id
     LEFT JOIN parents p ON p.id = ps.parent_id AND p.school_id = s.school_id
     WHERE s.id = $1 AND s.school_id = $2 AND s.deleted_at IS NULL
     LIMIT 1`,
    [studentId, schoolId],
  );
  const row = r.rows[0];
  if (!row) return null;

  const student: StudentRow = {
    id: row.id,
    school_id: row.school_id,
    academic_year_id: row.academic_year_id,
    grade_id: row.grade_id,
    class_id: row.class_id,
    student_code: row.student_code,
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name,
    gender: row.gender,
    date_of_birth: row.date_of_birth,
    national_id: row.national_id,
    avatar_url: row.avatar_url,
    address: row.address,
    parent_name: row.parent_name,
    parent_phone: row.parent_phone,
    parent_email: row.parent_email,
    relationship: row.relationship,
    phone: row.phone,
    status: row.status,
    grade: row.grade,
    student_login_code: row.student_login_code,
    parent_login_code: row.parent_login_code,
    qr_code: row.qr_code,
    email: row.email,
    user_id: row.user_id,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const relations: StudentDetailRelations = {
    academicYear: row.ay_id
      ? {
          id: row.ay_id,
          name: row.ay_name!,
          start_date: row.ay_start!,
          end_date: row.ay_end!,
          is_current: Boolean(row.ay_current),
        }
      : null,
    grade: row.g_id ? { id: row.g_id, name: row.g_name!, stage: row.g_stage! } : null,
    classroom: row.c_id ? { id: row.c_id, name: row.c_name!, capacity: row.c_capacity } : null,
    parent: {
      name: row.parent_name,
      phone: row.parent_phone,
      email: row.parent_email,
      whatsappNumber: row.parent_whatsapp ?? null,
      relationship: row.relationship,
    },
  };

  return { student, relations };
}

export async function findBySchoolAndPublicStudentId(
  schoolId: number,
  publicStudentId: string,
): Promise<StudentRow | null> {
  const r = await pool.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS}
     FROM students s
     WHERE s.school_id = $1
       AND s.deleted_at IS NULL
       AND (s.student_id = $2 OR s.student_code = $2)`,
    [schoolId, publicStudentId],
  );
  return r.rows[0] ?? null;
}

/** Atomically allocate next ST-{year}-{seq} code for the school */
export async function allocateStudentCode(schoolId: number, yearKey: number): Promise<string> {
  const r = await pool.query<{ last_value: number }>(
    `INSERT INTO student_code_sequences (school_id, year_key, last_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (school_id, year_key)
     DO UPDATE SET last_value = student_code_sequences.last_value + 1
     RETURNING last_value`,
    [schoolId, yearKey],
  );
  const seq = r.rows[0]?.last_value ?? 1;
  return `ST-${yearKey}-${String(seq).padStart(6, '0')}`;
}

export async function insert(input: {
  schoolId: number;
  academicYearId: number;
  gradeId: number;
  classId: number;
  studentCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  nationalId: string | null;
  avatarUrl: string | null;
  address: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  relationship: StudentRelationship;
  phone: string | null;
  status: StudentStatus;
  gradeLabel: string;
  studentLoginCode: string;
  parentLoginCode: string;
  qrPayload: string;
  userId: number;
}): Promise<StudentRow> {
  const r = await pool.query<StudentRow>(
    `INSERT INTO students (
       school_id, academic_year_id, grade_id, class_id,
       student_code, student_id, first_name, last_name, full_name,
       gender, date_of_birth, national_id, avatar_url, address,
       parent_name, parent_phone, parent_email, relationship, phone, status,
       grade, student_login_code, parent_login_code, qr_code, user_id, updated_at
     )
     VALUES (
       $1, $2, $3, $4,
       $5, $5, $6, $7, $8,
       $9, $10::date, $11, $12, $13,
       $14, $15, $16, $17, $18, $19::student_status,
       $20, $21, $22, $23, $24, NOW()
     )
     RETURNING id, school_id, academic_year_id, grade_id, class_id,
               student_code, student_id, first_name, last_name, full_name,
               gender, date_of_birth::text, national_id, avatar_url, address,
               parent_name, parent_phone, parent_email, relationship,
               phone, status, grade, student_login_code, parent_login_code, qr_code,
               email, user_id, deleted_at, created_at, updated_at`,
    [
      input.schoolId,
      input.academicYearId,
      input.gradeId,
      input.classId,
      input.studentCode,
      input.firstName,
      input.lastName,
      input.fullName,
      input.gender,
      input.dateOfBirth,
      input.nationalId,
      input.avatarUrl,
      input.address,
      input.parentName,
      input.parentPhone,
      input.parentEmail,
      input.relationship,
      input.phone,
      input.status,
      input.gradeLabel,
      input.studentLoginCode,
      input.parentLoginCode,
      input.qrPayload,
      input.userId,
    ],
  );
  return r.rows[0]!;
}

export async function update(
  studentId: number,
  schoolId: number,
  patch: {
    academicYearId?: number;
    gradeId?: number;
    classId?: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    nationalId?: string | null;
    dateOfBirth?: string;
    gender?: 'male' | 'female';
    address?: string | null;
    phone?: string | null;
    parentName?: string;
    parentPhone?: string | null;
    parentEmail?: string | null;
    relationship?: StudentRelationship;
    avatarUrl?: string | null;
    gradeLabel?: string | null;
    status?: StudentStatus;
  },
): Promise<StudentRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  const map: Array<[keyof typeof patch, string, string?]> = [
    ['academicYearId', 'academic_year_id'],
    ['gradeId', 'grade_id'],
    ['classId', 'class_id'],
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['fullName', 'full_name'],
    ['nationalId', 'national_id'],
    ['dateOfBirth', 'date_of_birth', '::date'],
    ['gender', 'gender'],
    ['address', 'address'],
    ['phone', 'phone'],
    ['parentName', 'parent_name'],
    ['parentPhone', 'parent_phone'],
    ['parentEmail', 'parent_email'],
    ['relationship', 'relationship'],
    ['avatarUrl', 'avatar_url'],
    ['gradeLabel', 'grade'],
    ['status', 'status', '::student_status'],
  ];

  for (const [key, col, cast] of map) {
    if (patch[key] !== undefined) {
      sets.push(`${col} = $${p++}${cast ?? ''}`);
      vals.push(patch[key]);
    }
  }

  if (sets.length === 0) return findByIdAndSchool(studentId, schoolId);

  sets.push(`updated_at = NOW()`);
  const idPos = p;
  const schoolPos = p + 1;
  vals.push(studentId, schoolId);
  const r = await pool.query<StudentRow>(
    `UPDATE students SET ${sets.join(', ')}
     WHERE id = $${idPos} AND school_id = $${schoolPos} AND deleted_at IS NULL
     RETURNING id, school_id, academic_year_id, grade_id, class_id,
               student_code, student_id, first_name, last_name, full_name,
               gender, date_of_birth::text, national_id, avatar_url, address,
               parent_name, parent_phone, parent_email, relationship,
               phone, status, grade, student_login_code, parent_login_code, qr_code,
               email, user_id, deleted_at, created_at, updated_at`,
    vals,
  );
  return r.rows[0] ?? null;
}

/** Soft delete */
export async function softDelete(studentId: number, schoolId: number): Promise<number | null> {
  const r = await pool.query<{ user_id: number | null }>(
    `UPDATE students
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
     RETURNING user_id`,
    [studentId, schoolId],
  );
  return r.rows.length ? (r.rows[0]?.user_id ?? null) : null;
}

export async function linkParentStudent(parentId: number, studentId: number): Promise<void> {
  await pool.query(
    `INSERT INTO parent_students (parent_id, student_id) VALUES ($1, $2)
     ON CONFLICT (parent_id, student_id) DO NOTHING`,
    [parentId, studentId],
  );
}

export async function listStudentIdsByGrade(schoolId: number, gradeId: number): Promise<number[]> {
  const r = await pool.query<{ id: number }>(
    `SELECT s.id
     FROM students s
     WHERE s.school_id = $1 AND s.grade_id = $2 AND s.deleted_at IS NULL`,
    [schoolId, gradeId],
  );
  return r.rows.map((x) => x.id);
}

export interface StudentLoginCodes {
  studentCode: string | null;
  parentCode: string | null;
}

export async function getLoginCodesByStudent(
  studentId: number,
  schoolId: number,
): Promise<StudentLoginCodes> {
  const r = await pool.query<{ student_code: string | null; parent_code: string | null }>(
    `SELECT s.student_login_code AS student_code, s.parent_login_code AS parent_code
     FROM students s
     WHERE s.id = $1 AND s.school_id = $2 AND s.deleted_at IS NULL`,
    [studentId, schoolId],
  );

  return {
    studentCode: r.rows[0]?.student_code ?? null,
    parentCode: r.rows[0]?.parent_code ?? null,
  };
}
