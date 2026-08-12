import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import pool from '../db/pool';
import { applyMigrations } from '../db/migrate';
import { config } from '../utils';

export { app, pool, request };

let dbReady = false;

export function isDbReady() {
  return dbReady;
}

export async function ensureTestDb() {
  try {
    // Fast fail if Postgres is down (avoid long migrate connection retries noise)
    await pool.query('SELECT 1');
    await applyMigrations(config.DATABASE_URL, 'up');
    dbReady = true;
  } catch (err) {
    dbReady = false;
    console.warn(
      '[tests] Database unavailable — integration tests will be skipped.',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function ensureSuperAdmin() {
  const email = `superadmin+tests@example.com`;
  const password = 'TestAdmin123!';
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, phone, password, name, role, status)
     VALUES ($1, NULL, $2, 'Test Super Admin', 'admin', 'active')
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       role = 'admin',
       status = 'active'`,
    [email, hash],
  );

  const login = await request(app).post('/api/auth/login').send({ username: email, password });

  if (login.status !== 200 || !login.body.token) {
    throw new Error(`Failed to login test admin: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return { email, password, token: login.body.token as string };
}

/** Tiny valid PNG (1x1) for multipart logo uploads */
export function tinyPngPath() {
  const dir = path.join(__dirname, '../../uploads/test-fixtures');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'logo.png');
  // 1x1 PNG
  const buf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  fs.writeFileSync(filePath, buf);
  return filePath;
}

export async function cleanupSchoolByAdminEmail(email: string) {
  const user = await pool.query<{ id: number; school_id: number | null }>(
    `SELECT id, school_id FROM users WHERE email = $1`,
    [email],
  );
  const row = user.rows[0];
  if (!row) return;

  if (row.school_id) {
    await pool.query(`DELETE FROM school_registration_codes WHERE school_id = $1`, [row.school_id]);
    await pool.query(`DELETE FROM users WHERE school_id = $1`, [row.school_id]);
    await pool.query(`DELETE FROM schools WHERE id = $1`, [row.school_id]);
  } else {
    await pool.query(`DELETE FROM users WHERE id = $1`, [row.id]);
  }
}

beforeAll(async () => {
  await ensureTestDb();
});

afterAll(async () => {
  await pool.end().catch(() => undefined);
});
