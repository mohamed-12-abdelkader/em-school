-- Up Migration
-- Allow same phone across different admins by dropping single-column unique
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Ensure guardian_phone column exists; if not, this migration assumes prior migration added it

-- Add composite unique to prevent duplicates for the same admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_guardian_admin_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_guardian_admin_unique UNIQUE (phone, guardian_phone, admin_id);
  END IF;
END$$;

-- Down Migration
-- Remove composite unique and re-add unique on phone
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_guardian_admin_unique;
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);




