import pool from '../db/pool';
import type { GradeStage, SchoolGradeRow } from '../types/schoolAcademic';

export async function countBySchool(schoolId: number): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM school_grades WHERE school_id = $1`,
    [schoolId],
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listBySchool(
  schoolId: number,
  limit: number,
  skip: number,
): Promise<SchoolGradeRow[]> {
  const r = await pool.query<SchoolGradeRow>(
    `SELECT id, school_id, name, stage, description, created_at, updated_at
     FROM school_grades
     WHERE school_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [schoolId, limit, skip],
  );
  return r.rows;
}

export async function findByIdAndSchool(
  id: number,
  schoolId: number,
): Promise<SchoolGradeRow | null> {
  const r = await pool.query<SchoolGradeRow>(
    `SELECT id, school_id, name, stage, description, created_at, updated_at
     FROM school_grades WHERE id = $1 AND school_id = $2`,
    [id, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function insert(input: {
  schoolId: number;
  name: string;
  stage: GradeStage;
  description: string | null;
}): Promise<SchoolGradeRow> {
  const r = await pool.query<SchoolGradeRow>(
    `INSERT INTO school_grades (school_id, name, stage, description)
     VALUES ($1, $2, $3::grade_stage, $4)
     RETURNING id, school_id, name, stage, description, created_at, updated_at`,
    [input.schoolId, input.name, input.stage, input.description],
  );
  return r.rows[0];
}

export async function update(
  id: number,
  schoolId: number,
  patch: { name?: string; stage?: GradeStage; description?: string | null },
): Promise<SchoolGradeRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (patch.name !== undefined) {
    sets.push(`name = $${p++}`);
    vals.push(patch.name);
  }
  if (patch.stage !== undefined) {
    sets.push(`stage = $${p++}::grade_stage`);
    vals.push(patch.stage);
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${p++}`);
    vals.push(patch.description);
  }
  if (sets.length === 0) return findByIdAndSchool(id, schoolId);

  sets.push(`updated_at = NOW()`);
  const idPos = p;
  const schoolPos = p + 1;
  vals.push(id, schoolId);

  const r = await pool.query<SchoolGradeRow>(
    `UPDATE school_grades SET ${sets.join(', ')}
     WHERE id = $${idPos} AND school_id = $${schoolPos}
     RETURNING id, school_id, name, stage, description, created_at, updated_at`,
    vals,
  );
  return r.rows[0] ?? null;
}

export async function remove(id: number, schoolId: number): Promise<boolean> {
  const r = await pool.query(`DELETE FROM school_grades WHERE id = $1 AND school_id = $2`, [
    id,
    schoolId,
  ]);
  return Boolean(r.rowCount && r.rowCount > 0);
}
