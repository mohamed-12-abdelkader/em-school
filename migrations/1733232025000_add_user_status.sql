-- Add status field to users table
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Add index for better performance when filtering by status
CREATE INDEX idx_users_status ON users(status);

-- Update existing users to have active status
UPDATE users SET status = 'active' WHERE status IS NULL;




