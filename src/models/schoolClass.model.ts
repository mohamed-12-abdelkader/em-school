import pool from '../db/pool';
import type { SchoolClassRow } from '../types/schoolAcademic';

export async function countByGrade(gradeId: number, schoolId: number): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM school_classes c
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.grade_id = $1 AND g.school_id = $2`,
    [gradeId, schoolId],
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listByGrade(
  gradeId: number,
  schoolId: number,
  limit: number,
  skip: number,
): Promise<SchoolClassRow[]> {
  const r = await pool.query<SchoolClassRow>(
    `SELECT c.id, c.grade_id, c.name, c.capacity, c.created_at, c.updated_at
     FROM school_classes c
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.grade_id = $1 AND g.school_id = $2
     ORDER BY c.created_at DESC
     LIMIT $3 OFFSET $4`,
    [gradeId, schoolId, limit, skip],
  );
  return r.rows;
}

export async function findByIdAndSchool(
  classId: number,
  schoolId: number,
): Promise<SchoolClassRow | null> {
  const r = await pool.query<SchoolClassRow>(
    `SELECT c.id, c.grade_id, c.name, c.capacity, c.created_at, c.updated_at
     FROM school_classes c
     JOIN school_grades g ON g.id = c.grade_id
     WHERE c.id = $1 AND g.school_id = $2`,
    [classId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function insert(input: {
  gradeId: number;
  name: string;
  capacity: number | null;
}): Promise<SchoolClassRow> {
  const r = await pool.query<SchoolClassRow>(
    `INSERT INTO school_classes (grade_id, name, capacity)
     VALUES ($1, $2, $3)
     RETURNING id, grade_id, name, capacity, created_at, updated_at`,
    [input.gradeId, input.name, input.capacity],
  );
  return r.rows[0];
}

export async function update(
  classId: number,
  schoolId: number,
  patch: { name?: string; capacity?: number | null },
): Promise<SchoolClassRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (patch.name !== undefined) {
    sets.push(`name = $${p++}`);
    vals.push(patch.name);
  }
  if (patch.capacity !== undefined) {
    sets.push(`capacity = $${p++}`);
    vals.push(patch.capacity);
  }
  if (sets.length === 0) return findByIdAndSchool(classId, schoolId);

  sets.push(`updated_at = NOW()`);
  const idPos = p;
  const schoolPos = p + 1;
  vals.push(classId, schoolId);

  const r = await pool.query<SchoolClassRow>(
    `UPDATE school_classes c SET ${sets.join(', ')}
     FROM school_grades g
     WHERE c.id = $${idPos} AND c.grade_id = g.id AND g.school_id = $${schoolPos}
     RETURNING c.id, c.grade_id, c.name, c.capacity, c.created_at, c.updated_at`,
    vals,
  );
  return r.rows[0] ?? null;
}

export async function remove(classId: number, schoolId: number): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM school_classes c
     USING school_grades g
     WHERE c.id = $1 AND c.grade_id = g.id AND g.school_id = $2`,
    [classId, schoolId],
  );
  return Boolean(r.rowCount && r.rowCount > 0);
}
