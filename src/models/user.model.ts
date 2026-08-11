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
  address: string | null;
  contact_phone: string | null;
  role: AppRole;
  status: string | null;
  jti: string | null;
  password_change_required: boolean;
  created_at: Date;
}

const USER_ROW_COLS =
  `id, email, phone, password, name, description, logo, address, contact_phone, role, status, jti, password_change_required, created_at`;

export async function findByEmail(email: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT ${USER_ROW_COLS} FROM users WHERE email = $1`,
    [email],
  );
  return r.rows[0] ?? null;
}

export async function findByLoginIdentifier(identifier: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT ${USER_ROW_COLS}
     FROM users
     WHERE email = $1 OR username = $1 OR phone = $1
     LIMIT 1`,
    [identifier],
  );
  return r.rows[0] ?? null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT ${USER_ROW_COLS} FROM users WHERE id = $1`,
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

export async function insertSchoolUser(
  input: {
    name: string;
    description: string | null;
    logoUrl: string;
    email: string;
    passwordHash: string;
    address: string | null;
    contactPhone: string | null;
  },
  client?: { query: typeof pool.query },
): Promise<UserRow> {
  const db = client ?? pool;
  const r = await db.query<UserRow>(
    `INSERT INTO users (
       name, description, logo, email, password, role, phone, status, address, contact_phone
     )
     VALUES ($1, $2, $3, $4, $5, 'school', NULL, 'active', $6, $7)
     RETURNING ${USER_ROW_COLS}`,
    [
      input.name,
      input.description,
      input.logoUrl,
      input.email,
      input.passwordHash,
      input.address,
      input.contactPhone,
    ],
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
  address: string | null;
  contact_phone: string | null;
  status: string | null;
  role: AppRole;
  created_at: Date;
}

const SCHOOL_ACCOUNT_COLS =
  `id, name, email, phone, username, description, logo, address, contact_phone, status, role, created_at`;

export async function listSchoolAccounts(
  limit: number,
  skip: number,
  q?: string,
): Promise<SchoolAccountRow[]> {
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    const r = await pool.query<SchoolAccountRow>(
      `SELECT ${SCHOOL_ACCOUNT_COLS}
       FROM users
       WHERE role = 'school' AND (name ILIKE $1 OR COALESCE(email, '') ILIKE $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [term, limit, skip],
    );
    return r.rows;
  }
  const r = await pool.query<SchoolAccountRow>(
    `SELECT ${SCHOOL_ACCOUNT_COLS}
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
    `SELECT ${SCHOOL_ACCOUNT_COLS}
     FROM users
     WHERE id = $1 AND role = 'school'`,
    [schoolId],
  );
  return r.rows[0] ?? null;
}

export async function updateSchoolAccount(
  schoolId: number,
  patch: {
    name?: string;
    description?: string | null;
    email?: string;
    address?: string | null;
    contactPhone?: string | null;
    logoUrl?: string;
  },
): Promise<SchoolAccountRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  const push = (col: string, value: unknown) => {
    values.push(value);
    sets.push(`${col} = $${values.length}`);
  };

  if (patch.name !== undefined) push('name', patch.name);
  if (patch.description !== undefined) push('description', patch.description);
  if (patch.email !== undefined) push('email', patch.email);
  if (patch.address !== undefined) push('address', patch.address);
  if (patch.contactPhone !== undefined) push('contact_phone', patch.contactPhone);
  if (patch.logoUrl !== undefined) push('logo', patch.logoUrl);

  if (!sets.length) {
    return findSchoolAccountById(schoolId);
  }

  values.push(schoolId);
  const r = await pool.query<SchoolAccountRow>(
    `UPDATE users
     SET ${sets.join(', ')}
     WHERE id = $${values.length} AND role = 'school'
     RETURNING ${SCHOOL_ACCOUNT_COLS}`,
    values,
  );
  return r.rows[0] ?? null;
}

export async function updateSchoolStatus(
  schoolId: number,
  status: 'active' | 'suspended' | 'deleted',
): Promise<SchoolAccountRow | null> {
  const r = await pool.query<SchoolAccountRow>(
    `UPDATE users
     SET status = $1
     WHERE id = $2 AND role = 'school'
     RETURNING ${SCHOOL_ACCOUNT_COLS}`,
    [status, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function emailExistsExcludingUser(
  email: string,
  excludeUserId: number,
): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM users WHERE email = $1 AND id <> $2 LIMIT 1`,
    [email, excludeUserId],
  );
  return Boolean(r.rowCount);
}

export interface SchoolUsersCountRow {
  schoolId: number;
  schoolName: string;
  usersCount: number;
}

export async function countUsersPerSchool(): Promise<SchoolUsersCountRow[]> {
  const r = await pool.query<{
    school_id: number;
    school_name: string;
    users_count: string;
  }>(
    `SELECT
       u.id AS school_id,
       u.name AS school_name,
       (
         1
         + COALESCE((
             SELECT COUNT(*)::int FROM students s
             WHERE s.school_id = u.id AND s.deleted_at IS NULL
           ), 0)
         + COALESCE((
             SELECT COUNT(*)::int FROM school_teachers t
             WHERE t.school_id = u.id AND t.deleted_at IS NULL
           ), 0)
         + COALESCE((
             SELECT COUNT(*)::int FROM parents p
             WHERE p.school_id = u.id
           ), 0)
       )::text AS users_count
     FROM users u
     WHERE u.role = 'school'
     ORDER BY u.name ASC`,
  );
  return r.rows.map((row) => ({
    schoolId: row.school_id,
    schoolName: row.school_name,
    usersCount: Number(row.users_count),
  }));
}

export async function countSchoolsByStatus(): Promise<Record<string, number>> {
  const r = await pool.query<{ status: string | null; c: string }>(
    `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::text AS c
     FROM users
     WHERE role = 'school'
     GROUP BY COALESCE(status, 'unknown')`,
  );
  const out: Record<string, number> = {
    active: 0,
    suspended: 0,
    deleted: 0,
    inactive: 0,
  };
  for (const row of r.rows) {
    out[row.status ?? 'unknown'] = Number(row.c);
  }
  return out;
}
