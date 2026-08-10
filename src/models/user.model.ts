import pool from '../db/pool';
import type { AppRole } from '../types/auth';

export interface UserRow {
  id: number;
  email: string | null;
  phone: string | null;
  password: string;
  name: string;
  description: string | null;
  logo: string | null;
  role: AppRole;
  status: string | null;
  jti: string | null;
  password_change_required: boolean;
  created_at: Date;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT id, email, phone, password, name, description, logo, role, status, jti, password_change_required, created_at
     FROM users WHERE email = $1`,
    [email],
  );
  return r.rows[0] ?? null;
}

export async function findByLoginIdentifier(identifier: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT id, email, phone, password, name, description, logo, role, status, jti, password_change_required, created_at
     FROM users
     WHERE email = $1 OR username = $1 OR phone = $1
     LIMIT 1`,
    [identifier],
  );
  return r.rows[0] ?? null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT id, email, phone, password, name, description, logo, role, status, jti, password_change_required, created_at
     FROM users WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
}

export async function updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
  await pool.query(
    `UPDATE users SET password = $1, password_change_required = FALSE WHERE id = $2`,
    [passwordHash, userId],
  );
}

export async function emailExists(email: string): Promise<boolean> {
  const r = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
  return Boolean(r.rowCount);
}

export async function insertSchoolUser(input: {
  name: string;
  description: string | null;
  logoUrl: string;
  email: string;
  passwordHash: string;
}): Promise<UserRow> {
  const r = await pool.query<UserRow>(
    `INSERT INTO users (name, description, logo, email, password, role, phone, status)
     VALUES ($1, $2, $3, $4, $5, 'school', NULL, 'active')
     RETURNING id, email, phone, password, name, description, logo, role, status, jti, password_change_required, created_at`,
    [input.name, input.description, input.logoUrl, input.email, input.passwordHash],
  );
  return r.rows[0];
}

/** حساب مدرسة للعرض (بدون كلمة مرور) — للأدمن */
export interface SchoolAccountRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  description: string | null;
  logo: string | null;
  status: string | null;
  role: AppRole;
  created_at: Date;
}

export async function listSchoolAccounts(
  limit: number,
  skip: number,
  q?: string,
): Promise<SchoolAccountRow[]> {
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    const r = await pool.query<SchoolAccountRow>(
      `SELECT id, name, email, phone, username, description, logo, status, role, created_at
       FROM users
       WHERE role = 'school' AND (name ILIKE $1 OR COALESCE(email, '') ILIKE $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [term, limit, skip],
    );
    return r.rows;
  }
  const r = await pool.query<SchoolAccountRow>(
    `SELECT id, name, email, phone, username, description, logo, status, role, created_at
     FROM users
     WHERE role = 'school'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, skip],
  );
  return r.rows;
}

export async function countSchoolAccounts(q?: string): Promise<number> {
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    const r = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c
       FROM users
       WHERE role = 'school' AND (name ILIKE $1 OR COALESCE(email, '') ILIKE $1)`,
      [term],
    );
    return Number(r.rows[0]?.c ?? 0);
  }
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM users WHERE role = 'school'`,
  );
  return Number(r.rows[0]?.c ?? 0);
}

export async function findSchoolAccountById(schoolId: number): Promise<SchoolAccountRow | null> {
  const r = await pool.query<SchoolAccountRow>(
    `SELECT id, name, email, phone, username, description, logo, status, role, created_at
     FROM users
     WHERE id = $1 AND role = 'school'`,
    [schoolId],
  );
  return r.rows[0] ?? null;
}
