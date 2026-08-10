import pool from '../db/pool';
import type { SchoolTeacherRow } from '../types/schoolSubjectsTeachers';
import type { SchoolClassRow } from '../types/schoolAcademic';

export async function insertMany(teacherId: number, classIds: number[]): Promise<void> {
  if (!classIds.length) return;

  const placeholders = classIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  const values: unknown[] = [teacherId, ...classIds];

  await pool.query(
    `INSERT INTO school_teacher_classes (teacher_id, class_id)
     VALUES ${placeholders}
     ON CONFLICT (teacher_id, class_id) DO NOTHING`,
    values,
  );
}

export async function remove(teacherId: number, classId: number): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM school_teacher_classes
     WHERE teacher_id = $1 AND class_id = $2`,
    [teacherId, classId],
  );
  return Boolean(res.rowCount && res.rowCount > 0);
}

export async function listClassesByTeacher(options: {
  teacherId: number;
  schoolId: number;
  limit: number;
  skip: number;
}): Promise<{ rows: SchoolClassRow[]; total: number }> {
  const { teacherId, schoolId, limit, skip } = options;

  const totalRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM school_teacher_classes stc
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.teacher_id = $1 AND g.school_id = $2`,
    [teacherId, schoolId],
  );

  const rowsRes = await pool.query<SchoolClassRow>(
    `SELECT c.id, c.grade_id, c.name, c.capacity, c.created_at, c.updated_at
     FROM school_teacher_classes stc
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.teacher_id = $1 AND g.school_id = $2
     ORDER BY c.created_at DESC
     LIMIT $3 OFFSET $4`,
    [teacherId, schoolId, limit, skip],
  );

  return { rows: rowsRes.rows, total: totalRes.rows[0]?.total ?? 0 };
}

export async function listTeachersByClass(options: {
  classId: number;
  schoolId: number;
  limit: number;
  skip: number;
}): Promise<{ rows: SchoolTeacherRow[]; total: number }> {
  const { classId, schoolId, limit, skip } = options;

  const totalRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM school_teacher_classes stc
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.class_id = $1 AND g.school_id = $2`,
    [classId, schoolId],
  );

  const rowsRes = await pool.query<SchoolTeacherRow>(
    `SELECT t.id, t.school_id, t.user_id, t.employee_code, t.first_name, t.last_name, t.full_name,
            t.photo, t.gender, t.phone, t.email, t.national_id, t.address, t.hire_date::text,
            t.specialization, t.status, t.name, t.description, t.subject_id, t.deleted_at,
            t.created_at, t.updated_at
     FROM school_teacher_classes stc
     JOIN school_teachers t ON t.id = stc.teacher_id
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.class_id = $1 AND g.school_id = $2
     ORDER BY t.created_at DESC
     LIMIT $3 OFFSET $4`,
    [classId, schoolId, limit, skip],
  );

  return { rows: rowsRes.rows, total: totalRes.rows[0]?.total ?? 0 };
}

export async function isTeacherAssignedToClass(options: {
  teacherId: number;
  classId: number;
  schoolId: number;
}): Promise<boolean> {
  const { teacherId, classId, schoolId } = options;

  const res = await pool.query<{ ok: number }>(
    `SELECT 1 as ok
     FROM school_teacher_classes stc
     JOIN school_teachers t ON t.id = stc.teacher_id
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.teacher_id = $1 AND stc.class_id = $2 AND t.school_id = $3 AND g.school_id = $3
     LIMIT 1`,
    [teacherId, classId, schoolId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listClassIdsByTeacher(
  teacherId: number,
  schoolId: number,
): Promise<number[]> {
  const res = await pool.query<{ class_id: number }>(
    `SELECT stc.class_id
     FROM school_teacher_classes stc
     JOIN school_classes c ON c.id = stc.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE stc.teacher_id = $1 AND g.school_id = $2`,
    [teacherId, schoolId],
  );
  return res.rows.map((r) => r.class_id);
}
