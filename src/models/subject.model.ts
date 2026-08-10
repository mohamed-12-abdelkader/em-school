import pool from '../db/pool';
import type { SubjectRow } from '../types/schoolSubjectsTeachers';

export async function listAll(options: {
  limit: number;
  skip: number;
  q?: string;
}): Promise<{ rows: SubjectRow[]; total: number }> {
  const { limit, skip, q } = options;

  const values: unknown[] = [];
  let where = '';
  if (q) {
    values.push(`%${q}%`);
    where = `WHERE name ILIKE $${values.length}`;
  }

  const totalQuery = `
    SELECT COUNT(*)::int AS total
    FROM subjects
    ${where}
  `;

  const rowsQuery = `
    SELECT id, name, description
    FROM subjects
    ${where}
    ORDER BY name ASC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const totalRes = await pool.query<{ total: number }>(totalQuery, values);
  const rowsRes = await pool.query<SubjectRow>(rowsQuery, [...values, limit, skip]);

  return { rows: rowsRes.rows, total: totalRes.rows[0]?.total ?? 0 };
}

export async function findById(id: number): Promise<SubjectRow | null> {
  const res = await pool.query<SubjectRow>(
    `SELECT id, name, description FROM subjects WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function create(input: {
  name: string;
  description?: string | null;
}): Promise<SubjectRow> {
  const res = await pool.query<SubjectRow>(
    `INSERT INTO subjects (name, description) VALUES ($1, $2)
     RETURNING id, name, description`,
    [input.name, input.description ?? null],
  );
  return res.rows[0];
}

export async function update(
  id: number,
  patch: { name?: string; description?: string | null },
): Promise<SubjectRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  if (patch.name !== undefined) {
    sets.push(`name = $${p++}`);
    vals.push(patch.name);
  }
  if (patch.description !== undefined) {
    sets.push(`description = $${p++}`);
    vals.push(patch.description);
  }
  if (!sets.length) return findById(id);

  const res = await pool.query<SubjectRow>(
    `UPDATE subjects
     SET ${sets.join(', ')}
     WHERE id = $${p}
     RETURNING id, name, description`,
    [...vals, id],
  );

  return res.rows[0] ?? null;
}

export async function remove(id: number): Promise<boolean> {
  const res = await pool.query(`DELETE FROM subjects WHERE id = $1`, [id]);
  return Boolean(res.rowCount && res.rowCount > 0);
}

export async function findExistingIds(ids: number[]): Promise<number[]> {
  if (!ids.length) return [];
  const res = await pool.query<{ id: number }>(
    `SELECT id FROM subjects WHERE id = ANY($1::int[])`,
    [ids],
  );
  return res.rows.map((r) => r.id);
}
