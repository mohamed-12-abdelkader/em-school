-- Module 1: School becomes its own organization entity;
-- former role='school' users become school_admin linked via school_id.
-- Preserve numeric IDs so existing school_id FKs keep working.

-- 1) Organization table (explicit IDs first so we can mirror old user ids)
CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  address TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS schools_id_seq;
ALTER SEQUENCE schools_id_seq OWNED BY schools.id;
ALTER TABLE schools ALTER COLUMN id SET DEFAULT nextval('schools_id_seq');

-- 2) Seed schools from legacy school-user rows (same id)
INSERT INTO schools (id, name, description, logo, address, contact_phone, status, created_at)
SELECT
  u.id,
  u.name,
  u.description,
  u.logo,
  u.address,
  u.contact_phone,
  CASE
    WHEN u.status IN ('active', 'suspended', 'deleted') THEN u.status
    ELSE 'active'
  END,
  COALESCE(u.created_at, NOW())
FROM users u
WHERE u.role = 'school'
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'schools_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM schools), 1), 1),
  true
);

-- If no schools were migrated, ensure the first insert gets id=1
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schools) THEN
    PERFORM setval('schools_id_seq', 1, false);
  END IF;
END $$;

-- 3) Link users to schools
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_school_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);

-- 4) Convert legacy school users → school_admin (keep name as display name)
UPDATE users u
SET
  role = 'school_admin',
  school_id = u.id,
  description = NULL,
  logo = NULL,
  address = NULL,
  contact_phone = NULL,
  status = CASE
    WHEN u.status IN ('suspended', 'deleted', 'inactive') THEN u.status
    ELSE 'active'
  END
WHERE u.role = 'school';

-- 5) Rewire school_id foreign keys from users → schools
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      c.conrelid::regclass AS table_name,
      c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'users'::regclass
      AND a.attname = 'school_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      r.table_name,
      r.constraint_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'school_registration_codes',
    'academic_years',
    'school_grades',
    'school_teachers',
    'school_schedule_slots',
    'grade_fee_plans',
    'student_attendance',
    'parents',
    'students',
    'attendance',
    'teacher_assignments',
    'student_code_sequences'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass(t) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f'
        AND c.conrelid = t::regclass
        AND a.attname = 'school_id'
        AND c.confrelid = 'schools'::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE',
        t,
        t || '_school_id_fkey'
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_schools_status ON schools (status);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools (name);
