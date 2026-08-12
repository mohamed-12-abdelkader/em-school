import pool from '../db/pool';
import type { TeacherAssignmentExpandedRow } from '../types/schoolSubjectsTeachers';

const ASSIGNMENT_SELECT = `
  ta.id, ta.school_id, ta.academic_year_id, ta.teacher_id, ta.grade_id,
  ta.classroom_id, ta.subject_id, ta.deleted_at, ta.created_at, ta.updated_at,
  ay.name AS academic_year_name,
  t.full_name AS teacher_name,
  t.employee_code AS teacher_employee_code,
  g.name AS grade_name,
  c.name AS classroom_name,
  s.name AS subject_name
`;

export interface AssignmentListFilters {
  teacherId?: number;
  academicYearId?: number;
  gradeId?: number;
  classroomId?: number;
  subjectId?: number;
  q?: string;
}

function buildWhere(schoolId: number, filters: AssignmentListFilters) {
  const values: unknown[] = [schoolId];
  let where = `WHERE ta.school_id = $1 AND ta.deleted_at IS NULL`;

  if (filters.teacherId !== undefined) {
    values.push(filters.teacherId);
    where += ` AND ta.teacher_id = $${values.length}`;
  }
  if (filters.academicYearId !== undefined) {
    values.push(filters.academicYearId);
    where += ` AND ta.academic_year_id = $${values.length}`;
  }
  if (filters.gradeId !== undefined) {
    values.push(filters.gradeId);
    where += ` AND ta.grade_id = $${values.length}`;
  }
  if (filters.classroomId !== undefined) {
    values.push(filters.classroomId);
    where += ` AND ta.classroom_id = $${values.length}`;
  }
  if (filters.subjectId !== undefined) {
    values.push(filters.subjectId);
    where += ` AND ta.subject_id = $${values.length}`;
  }
  if (filters.q?.trim()) {
    values.push(`%${filters.q.trim()}%`);
    where += ` AND (
      t.full_name ILIKE $${values.length}
      OR t.employee_code ILIKE $${values.length}
      OR g.name ILIKE $${values.length}
      OR c.name ILIKE $${values.length}
      OR s.name ILIKE $${values.length}
      OR ay.name ILIKE $${values.length}
    )`;
  }

  return { where, values };
}

export async function countBySchool(
  schoolId: number,
  filters: AssignmentListFilters,
): Promise<number> {
  const { where, values } = buildWhere(schoolId, filters);
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM teacher_assignments ta
     JOIN school_teachers t ON t.id = ta.teacher_id
     JOIN school_grades g ON g.id = ta.grade_id
     JOIN school_classes c ON c.id = ta.classroom_id
     JOIN subjects s ON s.id = ta.subject_id
     JOIN academic_years ay ON ay.id = ta.academic_year_id
     ${where}`,
    values,
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listBySchool(
  schoolId: number,
  limit: number,
  skip: number,
  filters: AssignmentListFilters,
): Promise<TeacherAssignmentExpandedRow[]> {
  const { where, values } = buildWhere(schoolId, filters);
  const r = await pool.query<TeacherAssignmentExpandedRow>(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM teacher_assignments ta
     JOIN school_teachers t ON t.id = ta.teacher_id AND t.school_id = ta.school_id
     JOIN school_grades g ON g.id = ta.grade_id AND g.school_id = ta.school_id
     JOIN school_classes c ON c.id = ta.classroom_id
     JOIN subjects s ON s.id = ta.subject_id
     JOIN academic_years ay ON ay.id = ta.academic_year_id AND ay.school_id = ta.school_id
     ${where}
     ORDER BY ta.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, skip],
  );
  return r.rows;
}

export async function listByTeacher(
  schoolId: number,
  teacherId: number,
): Promise<TeacherAssignmentExpandedRow[]> {
  return listBySchool(schoolId, 500, 0, { teacherId });
}

export async function findByIdAndSchool(
  assignmentId: number,
  schoolId: number,
): Promise<TeacherAssignmentExpandedRow | null> {
  const r = await pool.query<TeacherAssignmentExpandedRow>(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM teacher_assignments ta
     JOIN school_teachers t ON t.id = ta.teacher_id AND t.school_id = ta.school_id
     JOIN school_grades g ON g.id = ta.grade_id AND g.school_id = ta.school_id
     JOIN school_classes c ON c.id = ta.classroom_id
     JOIN subjects s ON s.id = ta.subject_id
     JOIN academic_years ay ON ay.id = ta.academic_year_id AND ay.school_id = ta.school_id
     WHERE ta.id = $1 AND ta.school_id = $2 AND ta.deleted_at IS NULL`,
    [assignmentId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function insert(input: {
  schoolId: number;
  academicYearId: number;
  teacherId: number;
  gradeId: number;
  classroomId: number;
  subjectId: number;
}): Promise<TeacherAssignmentExpandedRow> {
  const r = await pool.query<{ id: number }>(
    `INSERT INTO teacher_assignments (
       school_id, academic_year_id, teacher_id, grade_id, classroom_id, subject_id, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id`,
    [
      input.schoolId,
      input.academicYearId,
      input.teacherId,
      input.gradeId,
      input.classroomId,
      input.subjectId,
    ],
  );
  const id = r.rows[0]!.id;
  const row = await findByIdAndSchool(id, input.schoolId);
  if (!row) throw new Error('Failed to load created assignment');
  return row;
}

export async function update(
  assignmentId: number,
  schoolId: number,
  patch: {
    academicYearId?: number;
    teacherId?: number;
    gradeId?: number;
    classroomId?: number;
    subjectId?: number;
  },
): Promise<TeacherAssignmentExpandedRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  const map: Array<[keyof typeof patch, string]> = [
    ['academicYearId', 'academic_year_id'],
    ['teacherId', 'teacher_id'],
    ['gradeId', 'grade_id'],
    ['classroomId', 'classroom_id'],
    ['subjectId', 'subject_id'],
  ];

  for (const [key, col] of map) {
    if (patch[key] !== undefined) {
      sets.push(`${col} = $${p++}`);
      vals.push(patch[key]);
    }
  }

  if (!sets.length) return findByIdAndSchool(assignmentId, schoolId);

  sets.push(`updated_at = NOW()`);
  vals.push(assignmentId, schoolId);

  const r = await pool.query<{ id: number }>(
    `UPDATE teacher_assignments
     SET ${sets.join(', ')}
     WHERE id = $${p} AND school_id = $${p + 1} AND deleted_at IS NULL
     RETURNING id`,
    vals,
  );
  if (!r.rows[0]) return null;
  return findByIdAndSchool(r.rows[0].id, schoolId);
}

export async function softDelete(assignmentId: number, schoolId: number): Promise<boolean> {
  const r = await pool.query(
    `UPDATE teacher_assignments
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL`,
    [assignmentId, schoolId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function hasActiveAssignment(input: {
  schoolId: number;
  teacherId: number;
  classroomId: number;
  subjectId: number;
  academicYearId?: number;
  excludeAssignmentId?: number;
}): Promise<boolean> {
  const values: unknown[] = [input.schoolId, input.teacherId, input.classroomId, input.subjectId];
  let sql = `
    SELECT 1
    FROM teacher_assignments
    WHERE school_id = $1
      AND teacher_id = $2
      AND classroom_id = $3
      AND subject_id = $4
      AND deleted_at IS NULL
  `;
  if (input.academicYearId !== undefined) {
    values.push(input.academicYearId);
    sql += ` AND academic_year_id = $${values.length}`;
  }
  if (input.excludeAssignmentId !== undefined) {
    values.push(input.excludeAssignmentId);
    sql += ` AND id <> $${values.length}`;
  }
  sql += ' LIMIT 1';
  const r = await pool.query(sql, values);
  return (r.rowCount ?? 0) > 0;
}

export async function countTeacherClassroomAssignments(
  schoolId: number,
  teacherId: number,
  classroomId: number,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM teacher_assignments
     WHERE school_id = $1 AND teacher_id = $2 AND classroom_id = $3 AND deleted_at IS NULL`,
    [schoolId, teacherId, classroomId],
  );
  return Number(r.rows[0]?.c ?? 0);
}
