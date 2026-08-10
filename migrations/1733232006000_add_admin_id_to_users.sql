-- Up Migration
-- Add admin_id field to users table for student assignment
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users (id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_admin_id ON users (admin_id);

-- Down Migration
DROP INDEX IF EXISTS idx_users_admin_id;
ALTER TABLE users DROP COLUMN IF EXISTS admin_id;


