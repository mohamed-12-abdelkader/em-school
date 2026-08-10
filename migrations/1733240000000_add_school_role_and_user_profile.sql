-- Up: school role + profile fields for school accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'school'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'school';
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS logo TEXT;
