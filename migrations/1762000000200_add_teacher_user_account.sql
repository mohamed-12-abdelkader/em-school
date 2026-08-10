-- Add login account for school teachers (users table)
-- teacher auth uses users.email + users.password, role='teacher'

ALTER TABLE school_teachers
  ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE NULL REFERENCES users(id) ON DELETE CASCADE;

