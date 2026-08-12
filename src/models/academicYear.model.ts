import pool from '../db/pool';
import type { AcademicYearRow } from '../types/academicYear';

export async function countBySchool(schoolId: number): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM academic_years WHERE school_id = $1`,
    [schoolId],
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function listBySchool(
  schoolId: number,
  limit: number,
  skip: number,
): Promise<AcademicYearRow[]> {
  const r = await pool.query<AcademicYearRow>(
    `SELECT id, school_id, name, start_date::text, end_date::text, is_current, created_at, updated_at
     FROM academic_years
     WHERE school_id = $1
     ORDER BY start_date DESC
     LIMIT $2 OFFSET $3`,
    [schoolId, limit, skip],
  );
  return r.rows;
}

export async function findByIdAndSchool(
  id: number,
  schoolId: number,
): Promise<AcademicYearRow | null> {
  const r = await pool.query<AcademicYearRow>(
    `SELECT id, school_id, name, start_date::text, end_date::text, is_current, created_at, updated_at
     FROM academic_years
     WHERE id = $1 AND school_id = $2`,
    [id, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function findCurrentBySchool(schoolId: number): Promise<AcademicYearRow | null> {
  const r = await pool.query<AcademicYearRow>(
    `SELECT id, school_id, name, start_date::text, end_date::text, is_current, created_at, updated_at
     FROM academic_years
     WHERE school_id = $1 AND is_current = TRUE
     LIMIT 1`,
    [schoolId],
  );
  return r.rows[0] ?? null;
}

export async function clearCurrent(schoolId: number): Promise<void> {
  await pool.query(
    `UPDATE academic_years SET is_current = FALSE, updated_at = NOW()
     WHERE school_id = $1 AND is_current = TRUE`,
    [schoolId],
  );
}

export async function insert(input: {
  schoolId: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}): Promise<AcademicYearRow> {
  const r = await pool.query<AcademicYearRow>(
    `INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
     VALUES ($1, $2, $3::date, $4::date, $5)
     RETURNING id, school_id, name, start_date::text, end_date::text, is_current, created_at, updated_at`,
    [input.schoolId, input.name, input.startDate, input.endDate, input.isCurrent],
  );
  return r.rows[0]!;
}

export async function update(
  id: number,
  schoolId: number,
  patch: {
    name?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  },
): Promise<AcademicYearRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (patch.name !== undefined) {
    sets.push(`name = $${p++}`);
    vals.push(patch.name);
  }
  if (patch.startDate !== undefined) {
    sets.push(`start_date = $${p++}::date`);
    vals.push(patch.startDate);
  }
  if (patch.endDate !== undefined) {
    sets.push(`end_date = $${p++}::date`);
    vals.push(patch.endDate);
  }
  if (patch.isCurrent !== undefined) {
    sets.push(`is_current = $${p++}`);
    vals.push(patch.isCurrent);
  }
  if (sets.length === 0) return findByIdAndSchool(id, schoolId);

  sets.push(`updated_at = NOW()`);
  const idPos = p;
  const schoolPos = p + 1;
  vals.push(id, schoolId);
  const r = await pool.query<AcademicYearRow>(
    `UPDATE academic_years SET ${sets.join(', ')}
     WHERE id = $${idPos} AND school_id = $${schoolPos}
     RETURNING id, school_id, name, start_date::text, end_date::text, is_current, created_at, updated_at`,
    vals,
  );
  return r.rows[0] ?? null;
}

export async function remove(id: number, schoolId: number): Promise<boolean> {
  const r = await pool.query(`DELETE FROM academic_years WHERE id = $1 AND school_id = $2`, [
    id,
    schoolId,
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function countStudents(yearId: number, schoolId: number): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM students
     WHERE academic_year_id = $1 AND school_id = $2 AND deleted_at IS NULL`,
    [yearId, schoolId],
  );
  return Number(r.rows[0]?.c ?? 0);
}
