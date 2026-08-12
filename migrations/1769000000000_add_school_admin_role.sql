-- Add school_admin role (must be its own migration: new enum labels
-- cannot be used in the same transaction that creates them).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'school_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'school_admin';
  END IF;
END $$;
