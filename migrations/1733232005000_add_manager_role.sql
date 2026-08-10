-- Up Migration
-- Add 'manager' to user_role enum
ALTER TYPE user_role ADD VALUE 'manager';

-- Down Migration
-- Note: PostgreSQL doesn't support removing enum values directly
-- This would require recreating the enum type and updating all references
-- For now, we'll leave the manager role in place


