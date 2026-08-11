-- Module 1: Super Admin school profile fields, status values, registration codes

-- 1) Address + contact on school (users) accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2) Expand status check: keep inactive (legacy students/teachers); add suspended/deleted for schools
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- 3) Registration codes (one active code per school; regenerate revokes the old one)
CREATE TABLE IF NOT EXISTS school_registration_codes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_registration_codes_code_unique
  ON school_registration_codes (code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_registration_codes_one_active_per_school
  ON school_registration_codes (school_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_school_registration_codes_school_id
  ON school_registration_codes (school_id);
