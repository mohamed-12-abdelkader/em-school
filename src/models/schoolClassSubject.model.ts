import pool from '../db/pool';
import type { SubjectRow } from '../types/schoolSubjectsTeachers';

export async function getClassSchoolId(classId: number): Promise<number | null> {
  const r = await pool.query<{ school_id: number }>(
    `SELECT g.school_id
     FROM school_classes c
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.id = $1`,
    [classId],
  );
  return r.rows[0]?.school_id ?? null;
}

export async function listSubjectsByClass(
  classId: number,
  schoolId: number,
  limit: number,
  skip: number,
): Promise<{ rows: SubjectRow[]; total: number }> {
  const totalRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM school_class_subjects scs
     JOIN subjects s ON s.id = scs.subject_id
     JOIN school_classes c ON c.id = scs.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.id = $1 AND g.school_id = $2`,
    [classId, schoolId],
  );

  const rowsRes = await pool.query<SubjectRow>(
    `SELECT s.id, s.name, s.description
     FROM school_class_subjects scs
     JOIN subjects s ON s.id = scs.subject_id
     JOIN school_classes c ON c.id = scs.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.id = $1 AND g.school_id = $2
     ORDER BY s.name ASC
     LIMIT $3 OFFSET $4`,
    [classId, schoolId, limit, skip],
  );

  return {
    rows: rowsRes.rows,
    total: totalRes.rows[0]?.total ?? 0,
  };
}

export async function replaceSubjectsForClass(
  classId: number,
  schoolId: number,
  subjectIds: number[],
): Promise<void> {
  await pool.query(
    `DELETE FROM school_class_subjects scs
     USING school_classes c
     JOIN school_grades g ON g.id = c.grade_id
     WHERE scs.class_id = c.id AND c.id = $1 AND g.school_id = $2`,
    [classId, schoolId],
  );

  if (subjectIds.length === 0) return;

  const values: unknown[] = [classId, ...subjectIds];
  // ($1, $2), ($1, $3) ... -> easier via dynamic query
  const placeholders = subjectIds.map((_, i) => `($1, $${i + 2})`).join(', ');

  await pool.query(
    `INSERT INTO school_class_subjects (class_id, subject_id)
     VALUES ${placeholders}
     ON CONFLICT (class_id, subject_id) DO NOTHING`,
    values,
  );
}

export async function addSubjectsToClass(classId: number, subjectIds: number[]): Promise<void> {
  if (subjectIds.length === 0) return;

  const values: unknown[] = [classId, ...subjectIds];
  const placeholders = subjectIds.map((_, i) => `($1, $${i + 2})`).join(', ');

  await pool.query(
    `INSERT INTO school_class_subjects (class_id, subject_id)
     VALUES ${placeholders}
     ON CONFLICT (class_id, subject_id) DO NOTHING`,
    values,
  );
}

export async function classHasSubject(
  classId: number,
  schoolId: number,
  subjectId: number,
): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1
     FROM school_class_subjects scs
     JOIN school_classes c ON c.id = scs.class_id
     JOIN school_grades g ON g.id = c.grade_id
     WHERE scs.class_id = $1 AND scs.subject_id = $2 AND g.school_id = $3
     LIMIT 1`,
    [classId, subjectId, schoolId],
  );
  return (r.rowCount ?? 0) > 0;
}
