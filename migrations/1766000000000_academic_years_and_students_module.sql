-- Academic years + Students module evolution (grade FK, student_code, parent fields, status, soft delete)

-- 1) Academic years (school-scoped)
CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_years_school_name_unique UNIQUE (school_id, name),
  CONSTRAINT academic_years_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years (school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school_current ON academic_years (school_id, is_current);

-- At most one current year per school
CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_current_per_school
  ON academic_years (school_id)
  WHERE is_current = TRUE;

-- 2) Student status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
    CREATE TYPE student_status AS ENUM ('active', 'suspended', 'graduated', 'transferred');
  END IF;
END $$;

-- 3) Sequence helper for ST-{year}-{seq}
CREATE TABLE IF NOT EXISTS student_code_sequences (
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  year_key INTEGER NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, year_key)
);

-- 4) Extend students
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years (id) ON DELETE RESTRICT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES school_grades (id) ON DELETE RESTRICT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS relationship TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status student_status NOT NULL DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- relationship check (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_relationship_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_relationship_check
      CHECK (
        relationship IS NULL
        OR relationship IN ('father', 'mother', 'guardian', 'other')
      );
  END IF;
END $$;

-- Allow nullable national_id (spec)
ALTER TABLE students ALTER COLUMN national_id DROP NOT NULL;

-- Allow nullable avatar (photo optional)
ALTER TABLE students ALTER COLUMN avatar_url DROP NOT NULL;

-- 5) Backfill grade_id from classroom
UPDATE students s
SET grade_id = c.grade_id
FROM school_classes c
WHERE c.id = s.class_id
  AND s.grade_id IS NULL;

-- 6) Backfill names from full_name
UPDATE students
SET
  first_name = COALESCE(NULLIF(TRIM(first_name), ''), NULLIF(SPLIT_PART(TRIM(full_name), ' ', 1), ''), full_name),
  last_name = COALESCE(
    NULLIF(TRIM(last_name), ''),
    NULLIF(TRIM(SUBSTRING(TRIM(full_name) FROM LENGTH(SPLIT_PART(TRIM(full_name), ' ', 1)) + 2)), ''),
    ''
  )
WHERE first_name IS NULL OR last_name IS NULL;

UPDATE students SET last_name = '' WHERE last_name IS NULL;
UPDATE students SET first_name = COALESCE(first_name, full_name) WHERE first_name IS NULL;

-- 7) Backfill student_code from legacy public student_id
UPDATE students
SET student_code = student_id
WHERE student_code IS NULL AND student_id IS NOT NULL;

-- 8) Default academic year per school that has students without year
INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
SELECT
  s.school_id,
  EXTRACT(YEAR FROM NOW())::text || '/' || (EXTRACT(YEAR FROM NOW())::int + 1)::text,
  MAKE_DATE(EXTRACT(YEAR FROM NOW())::int, 9, 1),
  MAKE_DATE(EXTRACT(YEAR FROM NOW())::int + 1, 8, 31),
  TRUE
FROM students s
WHERE s.academic_year_id IS NULL
GROUP BY s.school_id
ON CONFLICT (school_id, name) DO NOTHING;

-- Ensure one current flag for schools that got a year inserted without current
UPDATE academic_years ay
SET is_current = TRUE
WHERE ay.is_current = FALSE
  AND ay.id = (
    SELECT ay2.id FROM academic_years ay2
    WHERE ay2.school_id = ay.school_id
    ORDER BY ay2.start_date DESC
    LIMIT 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM academic_years x WHERE x.school_id = ay.school_id AND x.is_current = TRUE
  );

UPDATE students s
SET academic_year_id = (
  SELECT ay.id FROM academic_years ay
  WHERE ay.school_id = s.school_id
  ORDER BY ay.is_current DESC, ay.start_date DESC
  LIMIT 1
)
WHERE s.academic_year_id IS NULL;

-- 9) Parent fields backfill from parents table when possible
UPDATE students s
SET
  parent_name = COALESCE(s.parent_name, p.full_name),
  parent_email = COALESCE(s.parent_email, p.email),
  relationship = COALESCE(s.relationship, p.relation),
  parent_phone = COALESCE(s.parent_phone, p.phone)
FROM parent_students ps
JOIN parents p ON p.id = ps.parent_id
WHERE ps.student_id = s.id
  AND p.school_id = s.school_id
  AND (s.parent_name IS NULL OR s.relationship IS NULL);

UPDATE students SET parent_name = COALESCE(parent_name, 'ولي أمر') WHERE parent_name IS NULL;
UPDATE students SET relationship = COALESCE(relationship, 'father') WHERE relationship IS NULL;

-- 10) NOT NULL where data is ready
ALTER TABLE students ALTER COLUMN grade_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN academic_year_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN student_code SET NOT NULL;
ALTER TABLE students ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE students ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE students ALTER COLUMN parent_name SET NOT NULL;
ALTER TABLE students ALTER COLUMN relationship SET NOT NULL;

-- 11) Unique / indexes (soft-delete aware)
DROP INDEX IF EXISTS students_school_student_id_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS students_school_student_id_uidx
  ON students (school_id, student_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_student_code_uidx
  ON students (student_code)
  WHERE deleted_at IS NULL;

-- Replace school+national unique with soft-delete aware partial unique
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_school_national_unique;
CREATE UNIQUE INDEX IF NOT EXISTS students_school_national_uidx
  ON students (school_id, national_id)
  WHERE national_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students (school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_academic_year_id ON students (academic_year_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_grade_id ON students (grade_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_classroom_id ON students (class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students (student_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students (parent_phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_school_status ON students (school_id, status) WHERE deleted_at IS NULL;
