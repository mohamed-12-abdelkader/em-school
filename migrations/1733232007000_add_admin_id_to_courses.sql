-- Up Migration
-- Add admin_id to courses so each admin owns their own courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users (id) ON DELETE SET NULL;

-- Optional index to speed up lookups by admin
CREATE INDEX IF NOT EXISTS idx_courses_admin_id ON courses (admin_id);

-- Backfill existing rows to NULL (no action needed if column is new)

-- Down Migration
DROP INDEX IF EXISTS idx_courses_admin_id;
ALTER TABLE courses DROP COLUMN IF EXISTS admin_id;




