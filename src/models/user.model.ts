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
  school_id: number | null;
  created_at: Date;
}

const USER_ROW_COLS = `id, email, phone, password, name, description, logo, address, contact_phone, role, status, jti, password_change_required, school_id, created_at`;

export async function findByEmail(email: string): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(`SELECT ${USER_ROW_COLS} FROM users WHERE email = $1`, [
    email,
  ]);
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
  const r = await pool.query<UserRow>(`SELECT ${USER_ROW_COLS} FROM users WHERE id = $1`, [id]);
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

export async function emailExistsExcludingUser(
  email: string,
  excludeUserId: number,
): Promise<boolean> {
  const r = await pool.query(`SELECT 1 FROM users WHERE email = $1 AND id <> $2 LIMIT 1`, [
    email,
    excludeUserId,
  ]);
  return Boolean(r.rowCount);
}

export interface SchoolAdminRow {
  id: number;
  email: string | null;
  name: string;
  role: AppRole;
  school_id: number | null;
  status: string | null;
  created_at: Date;
}

const SCHOOL_ADMIN_COLS = `id, email, name, role, school_id, status, created_at`;

export async function insertSchoolAdmin(
  input: {
    schoolId: number;
    email: string;
    passwordHash: string;
    name: string;
  },
  client?: { query: typeof pool.query },
): Promise<SchoolAdminRow> {
  const db = client ?? pool;
  const r = await db.query<SchoolAdminRow>(
    `INSERT INTO users (email, phone, password, name, role, status, school_id)
     VALUES ($1, NULL, $2, $3, 'school_admin', 'active', $4)
     RETURNING ${SCHOOL_ADMIN_COLS}`,
    [input.email, input.passwordHash, input.name, input.schoolId],
  );
  return r.rows[0];
}

export interface StaffRow {
  id: number;
  email: string | null;
  phone: string | null;
  name: string;
  role: AppRole;
  school_id: number | null;
  status: string | null;
  created_at: Date;
}

const STAFF_COLS = `id, email, phone, name, role, school_id, status, created_at`;

export async function phoneExists(phone: string): Promise<boolean> {
  const r = await pool.query('SELECT 1 FROM users WHERE phone = $1 LIMIT 1', [phone]);
  return Boolean(r.rowCount);
}

export async function insertStudentAffairsStaff(input: {
  schoolId: number;
  email: string;
  phone: string;
  passwordHash: string;
  name: string;
}): Promise<StaffRow> {
  const r = await pool.query<StaffRow>(
    `INSERT INTO users (email, phone, password, name, role, status, school_id)
     VALUES ($1, $2, $3, $4, 'student_affairs', 'active', $5)
     RETURNING ${STAFF_COLS}`,
    [input.email, input.phone, input.passwordHash, input.name, input.schoolId],
  );
  return r.rows[0];
}

export async function findStaffByIdAndSchool(
  staffId: number,
  schoolId: number,
): Promise<StaffRow | null> {
  const r = await pool.query<StaffRow>(
    `SELECT ${STAFF_COLS}
     FROM users
     WHERE id = $1 AND school_id = $2 AND role = 'student_affairs'`,
    [staffId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function updateStaffStatus(
  staffId: number,
  schoolId: number,
  status: 'active' | 'inactive',
): Promise<StaffRow | null> {
  const r = await pool.query<StaffRow>(
    `UPDATE users
     SET status = $1
     WHERE id = $2 AND school_id = $3 AND role = 'student_affairs'
     RETURNING ${STAFF_COLS}`,
    [status, staffId, schoolId],
  );
  return r.rows[0] ?? null;
}

export async function findSchoolAdminBySchoolId(schoolId: number): Promise<SchoolAdminRow | null> {
  const r = await pool.query<SchoolAdminRow>(
    `SELECT ${SCHOOL_ADMIN_COLS}
     FROM users
     WHERE school_id = $1 AND role = 'school_admin'
     ORDER BY id ASC
     LIMIT 1`,
    [schoolId],
  );
  return r.rows[0] ?? null;
}
