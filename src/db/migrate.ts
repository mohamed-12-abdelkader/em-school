import { runner } from 'node-pg-migrate';
import path from 'path';
import { config } from '../utils';
import pool from './pool';
import bcrypt from 'bcrypt';

export async function applyMigrations(databaseUrl: string, direction: 'up' | 'down') {
  await runner({
    count: Number.POSITIVE_INFINITY,
    databaseUrl: databaseUrl,
    dir: path.resolve(__dirname, '../../migrations'),
    direction,
    migrationsTable: 'migrations',
    verbose: false,
  });

  if (direction !== 'up') return;

  const {
    FIRST_SUPERUSER,
    FIRST_SUPERUSER_PASSWORD,
    FIRST_SUPERUSER_NAME,
    FIRST_SUPERUSER_PREVIOUS_EMAIL,
  } = config;

  if (!FIRST_SUPERUSER || !FIRST_SUPERUSER_PASSWORD) return;

  const hashed = await bcrypt.hash(FIRST_SUPERUSER_PASSWORD, 10);
  const displayName = FIRST_SUPERUSER_NAME;

  // Optional: move admin from old email to new (remove FIRST_SUPERUSER_PREVIOUS_EMAIL from .env after success)
  if (FIRST_SUPERUSER_PREVIOUS_EMAIL) {
    const migrated = await pool.query(
      `UPDATE users
       SET email = $1,
           password = $2,
           name = $3,
           phone = CASE WHEN POSITION('@' IN $1) = 0 THEN $1 ELSE NULL END
       WHERE email = $4 AND role = 'admin'`,
      [FIRST_SUPERUSER, hashed, displayName, FIRST_SUPERUSER_PREVIOUS_EMAIL],
    );
    if (migrated.rowCount && migrated.rowCount > 0) {
      console.log('✅ Admin migrated from previous email to new credentials.');
      return;
    }
  }

  await pool.query(
    `INSERT INTO users (email, phone, password, name, role)
     VALUES (
       $1,
       CASE WHEN POSITION('@' IN $1) = 0 THEN $1 ELSE NULL END,
       $2,
       $3,
       'admin'
     )
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       name = EXCLUDED.name`,
    [FIRST_SUPERUSER, hashed, displayName],
  );
  console.log('✅ Admin user created or synced from environment.');
}
