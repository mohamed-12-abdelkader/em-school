-- Up Migration
-- Add guardian_phone to users table for storing student's guardian phone number
ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- Optional constraint: ensure guardian_phone is different from student's phone if both present
-- (skip if not needed)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.table_constraints 
--     WHERE constraint_name = 'users_guardian_phone_diff_check'
--   ) THEN
--     ALTER TABLE users
--     ADD CONSTRAINT users_guardian_phone_diff_check
--     CHECK (guardian_phone IS NULL OR phone IS NULL OR guardian_phone <> phone);
--   END IF;
-- END $$;

-- Down Migration
ALTER TABLE users DROP COLUMN IF EXISTS guardian_phone;



