import pool from '../db/pool';
import type { ParentRow } from '../types/studentAffairs';

export async function findBySchoolAndPhone(
  schoolId: number,
  phone: string,
): Promise<ParentRow | null> {
  const r = await pool.query<ParentRow>(
    `SELECT id, school_id, full_name, phone, email, relation, user_id, created_at, updated_at
     FROM parents
     WHERE school_id = $1 AND phone = $2`,
    [schoolId, phone],
  );
  return r.rows[0] ?? null;
}

export async function insert(input: {
  schoolId: number;
  fullName: string;
  phone: string;
  email: string | null;
  relation: 'father' | 'mother' | 'other';
  userId: number;
}): Promise<ParentRow> {
  const r = await pool.query<ParentRow>(
    `INSERT INTO parents (school_id, full_name, phone, email, relation, user_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, school_id, full_name, phone, email, relation, user_id, created_at, updated_at`,
    [input.schoolId, input.fullName, input.phone, input.email, input.relation, input.userId],
  );
  return r.rows[0]!;
}

export async function updateNameEmail(
  parentId: number,
  schoolId: number,
  patch: { fullName?: string; email?: string | null },
): Promise<ParentRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (patch.fullName !== undefined) {
    sets.push(`full_name = $${p++}`);
    vals.push(patch.fullName);
  }
  if (patch.email !== undefined) {
    sets.push(`email = $${p++}`);
    vals.push(patch.email);
  }
  if (sets.length === 0) {
    const r = await pool.query<ParentRow>(
      `SELECT id, school_id, full_name, phone, email, relation, user_id, created_at, updated_at
       FROM parents WHERE id = $1 AND school_id = $2`,
      [parentId, schoolId],
    );
    return r.rows[0] ?? null;
  }
  sets.push(`updated_at = NOW()`);
  const idPos = p;
  const schoolPos = p + 1;
  vals.push(parentId, schoolId);
  const r = await pool.query<ParentRow>(
    `UPDATE parents SET ${sets.join(', ')}
     WHERE id = $${idPos} AND school_id = $${schoolPos}
     RETURNING id, school_id, full_name, phone, email, relation, user_id, created_at, updated_at`,
    vals,
  );
  return r.rows[0] ?? null;
}
