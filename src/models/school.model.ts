import pool from '../db/pool';

export type SchoolStatus = 'active' | 'suspended' | 'deleted';

export interface SchoolRow {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  address: string | null;
  contact_phone: string | null;
  status: SchoolStatus;
  created_at: Date;
}

const SCHOOL_COLS = `id, name, description, logo, address, contact_phone, status, created_at`;

type Queryable = { query: typeof pool.query };

export async function insertSchool(
  input: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    address: string | null;
    contactPhone: string | null;
    status?: SchoolStatus;
  },
  client?: Queryable,
): Promise<SchoolRow> {
  const db = client ?? pool;
  const r = await db.query<SchoolRow>(
    `INSERT INTO schools (name, description, logo, address, contact_phone, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SCHOOL_COLS}`,
    [
      input.name,
      input.description,
      input.logoUrl,
      input.address,
      input.contactPhone,
      input.status ?? 'active',
    ],
  );
  return r.rows[0];
}

export async function listSchools(limit: number, skip: number, q?: string): Promise<SchoolRow[]> {
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    const r = await pool.query<SchoolRow>(
      `SELECT ${SCHOOL_COLS}
       FROM schools
       WHERE name ILIKE $1 OR COALESCE(description, '') ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [term, limit, skip],
    );
    return r.rows;
  }

  const r = await pool.query<SchoolRow>(
    `SELECT ${SCHOOL_COLS}
     FROM schools
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, skip],
  );
  return r.rows;
}

export async function countSchools(q?: string): Promise<number> {
  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    const r = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c
       FROM schools
       WHERE name ILIKE $1 OR COALESCE(description, '') ILIKE $1`,
      [term],
    );
    return Number(r.rows[0]?.c ?? 0);
  }

  const r = await pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM schools`);
  return Number(r.rows[0]?.c ?? 0);
}

export async function findById(schoolId: number): Promise<SchoolRow | null> {
  const r = await pool.query<SchoolRow>(`SELECT ${SCHOOL_COLS} FROM schools WHERE id = $1`, [
    schoolId,
  ]);
  return r.rows[0] ?? null;
}

export async function updateSchool(
  schoolId: number,
  patch: {
    name?: string;
    description?: string | null;
    address?: string | null;
    contactPhone?: string | null;
    logoUrl?: string;
  },
): Promise<SchoolRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  const push = (col: string, value: unknown) => {
    values.push(value);
    sets.push(`${col} = $${values.length}`);
  };

  if (patch.name !== undefined) push('name', patch.name);
  if (patch.description !== undefined) push('description', patch.description);
  if (patch.address !== undefined) push('address', patch.address);
  if (patch.contactPhone !== undefined) push('contact_phone', patch.contactPhone);
  if (patch.logoUrl !== undefined) push('logo', patch.logoUrl);

  if (!sets.length) {
    return findById(schoolId);
  }

  values.push(schoolId);
  const r = await pool.query<SchoolRow>(
    `UPDATE schools
     SET ${sets.join(', ')}
     WHERE id = $${values.length}
     RETURNING ${SCHOOL_COLS}`,
    values,
  );
  return r.rows[0] ?? null;
}

export async function updateStatus(
  schoolId: number,
  status: SchoolStatus,
): Promise<SchoolRow | null> {
  const r = await pool.query<SchoolRow>(
    `UPDATE schools
     SET status = $1
     WHERE id = $2
     RETURNING ${SCHOOL_COLS}`,
    [status, schoolId],
  );
  return r.rows[0] ?? null;
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
       s.id AS school_id,
       s.name AS school_name,
       (
         COALESCE((
           SELECT COUNT(*)::int FROM users u
           WHERE u.school_id = s.id
         ), 0)
         + COALESCE((
           SELECT COUNT(*)::int FROM students st
           WHERE st.school_id = s.id AND st.deleted_at IS NULL
         ), 0)
         + COALESCE((
           SELECT COUNT(*)::int FROM school_teachers t
           WHERE t.school_id = s.id AND t.deleted_at IS NULL
         ), 0)
         + COALESCE((
           SELECT COUNT(*)::int FROM parents p
           WHERE p.school_id = s.id
         ), 0)
       )::text AS users_count
     FROM schools s
     ORDER BY s.name ASC`,
  );

  return r.rows.map((row) => ({
    schoolId: row.school_id,
    schoolName: row.school_name,
    usersCount: Number(row.users_count),
  }));
}

export async function countByStatus(): Promise<Record<string, number>> {
  const r = await pool.query<{ status: string; c: string }>(
    `SELECT status, COUNT(*)::text AS c
     FROM schools
     GROUP BY status`,
  );

  const out: Record<string, number> = {
    active: 0,
    suspended: 0,
    deleted: 0,
  };

  for (const row of r.rows) {
    out[row.status] = Number(row.c);
  }
  return out;
}
