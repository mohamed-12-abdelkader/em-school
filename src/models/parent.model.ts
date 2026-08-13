import pool from '../db/pool';
import type { ParentRow } from '../types/studentAffairs';

const PARENT_COLS = `id, school_id, full_name, phone, email, whatsapp_number, relation, user_id, created_at, updated_at`;

export async function findBySchoolAndPhone(
  schoolId: number,
  phone: string,
): Promise<ParentRow | null> {
  const r = await pool.query<ParentRow>(
    `SELECT ${PARENT_COLS}
     FROM parents
     WHERE school_id = $1 AND phone = $2`,
    [schoolId, phone],
  );
  return r.rows[0] ?? null;
}

export async function findByStudentId(
  studentId: number,
  schoolId: number,
): Promise<ParentRow | null> {
  const r = await pool.query<ParentRow>(
    `SELECT p.id, p.school_id, p.full_name, p.phone, p.email, p.whatsapp_number,
            p.relation, p.user_id, p.created_at, p.updated_at
     FROM parents p
     JOIN parent_students ps ON ps.parent_id = p.id
     WHERE ps.student_id = $1 AND p.school_id = $2
     ORDER BY p.id ASC
     LIMIT 1`,
    [studentId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function insert(input: {
  schoolId: number;
  fullName: string;
  phone: string;
  email: string | null;
  whatsappNumber?: string | null;
  relation: 'father' | 'mother' | 'other';
  userId: number;
}): Promise<ParentRow> {
  const r = await pool.query<ParentRow>(
    `INSERT INTO parents (school_id, full_name, phone, email, whatsapp_number, relation, user_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING ${PARENT_COLS}`,
    [
      input.schoolId,
      input.fullName,
      input.phone,
      input.email,
      input.whatsappNumber ?? null,
      input.relation,
      input.userId,
    ],
  );
  return r.rows[0]!;
}

export async function update(
  parentId: number,
  schoolId: number,
  patch: { fullName?: string; email?: string | null; whatsappNumber?: string | null },
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
  if (patch.whatsappNumber !== undefined) {
    sets.push(`whatsapp_number = $${p++}`);
    vals.push(patch.whatsappNumber);
  }
  if (sets.length === 0) {
    const r = await pool.query<ParentRow>(
      `SELECT ${PARENT_COLS} FROM parents WHERE id = $1 AND school_id = $2`,
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
     RETURNING ${PARENT_COLS}`,
    vals,
  );
  return r.rows[0] ?? null;
}

/** @deprecated use update() */
export async function updateNameEmail(
  parentId: number,
  schoolId: number,
  patch: { fullName?: string; email?: string | null },
): Promise<ParentRow | null> {
  return update(parentId, schoolId, patch);
}
