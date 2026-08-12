import pool from '../db/pool';

export type RegistrationCodeStatus = 'active' | 'revoked';

export interface RegistrationCodeRow {
  id: number;
  school_id: number;
  code: string;
  status: RegistrationCodeStatus;
  created_at: Date;
  revoked_at: Date | null;
}

export async function findActiveBySchoolId(schoolId: number): Promise<RegistrationCodeRow | null> {
  const r = await pool.query<RegistrationCodeRow>(
    `SELECT id, school_id, code, status, created_at, revoked_at
     FROM school_registration_codes
     WHERE school_id = $1 AND status = 'active'
     LIMIT 1`,
    [schoolId],
  );
  return r.rows[0] ?? null;
}

export async function insertActiveCode(
  schoolId: number,
  code: string,
  client?: { query: typeof pool.query },
): Promise<RegistrationCodeRow> {
  const db = client ?? pool;
  const r = await db.query<RegistrationCodeRow>(
    `INSERT INTO school_registration_codes (school_id, code, status)
     VALUES ($1, $2, 'active')
     RETURNING id, school_id, code, status, created_at, revoked_at`,
    [schoolId, code],
  );
  return r.rows[0];
}

export async function revokeActiveForSchool(
  schoolId: number,
  client?: { query: typeof pool.query },
): Promise<void> {
  const db = client ?? pool;
  await db.query(
    `UPDATE school_registration_codes
     SET status = 'revoked', revoked_at = NOW()
     WHERE school_id = $1 AND status = 'active'`,
    [schoolId],
  );
}

export async function codeExists(code: string): Promise<boolean> {
  const r = await pool.query(`SELECT 1 FROM school_registration_codes WHERE code = $1 LIMIT 1`, [
    code,
  ]);
  return Boolean(r.rowCount);
}
