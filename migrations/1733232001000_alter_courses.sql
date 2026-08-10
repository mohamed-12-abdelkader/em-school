-- Up Migration
-- Add image_url and grade_id to courses; relax teacher_id nullability
ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES grades (id) ON DELETE SET NULL;
-- Drop NOT NULL from teacher_id to allow admin-created courses without assigned teacher
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'teacher_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE courses ALTER COLUMN teacher_id DROP NOT NULL;
  END IF;
END $$;

-- تعديل جدول المحاضرات لإضافة الأعمدة المطلوبة
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Down Migration
-- Remove columns and restore NOT NULL on teacher_id (may fail if nulls exist)
ALTER TABLE courses DROP COLUMN IF EXISTS image_url;
ALTER TABLE courses DROP COLUMN IF EXISTS grade_id;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'teacher_id' AND is_nullable = 'YES'
  ) THEN
    -- This will error if null values exist in teacher_id
    ALTER TABLE courses ALTER COLUMN teacher_id SET NOT NULL;
  END IF;
END $$;


