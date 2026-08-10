-- Teachers module evolution + teacher_assignments (subject per classroom)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_status') THEN
    CREATE TYPE teacher_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS teacher_code_global_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_value INTEGER NOT NULL DEFAULT 0
);

INSERT INTO teacher_code_global_sequence (id, last_value)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS status teacher_status NOT NULL DEFAULT 'active';
ALTER TABLE school_teachers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Multi-subject teachers: subject_id becomes optional (legacy column)
ALTER TABLE school_teachers ALTER COLUMN subject_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_teachers_gender_check') THEN
    ALTER TABLE school_teachers
      ADD CONSTRAINT school_teachers_gender_check
      CHECK (gender IS NULL OR gender IN ('male', 'female'));
  END IF;
END $$;

-- Backfill names from legacy `name`
UPDATE school_teachers
SET
  first_name = COALESCE(NULLIF(TRIM(first_name), ''), NULLIF(SPLIT_PART(TRIM(name), ' ', 1), ''), name),
  last_name = COALESCE(
    NULLIF(TRIM(last_name), ''),
    NULLIF(TRIM(SUBSTRING(TRIM(name) FROM LENGTH(SPLIT_PART(TRIM(name), ' ', 1)) + 2)), ''),
    ''
  ),
  full_name = COALESCE(NULLIF(TRIM(full_name), ''), name)
WHERE full_name IS NULL OR first_name IS NULL;

UPDATE school_teachers SET last_name = '' WHERE last_name IS NULL;
UPDATE school_teachers SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL;

-- Backfill employee codes (global sequence)
WITH numbered AS (
  SELECT
    st.id,
    ROW_NUMBER() OVER (ORDER BY st.school_id, st.id) AS rn
  FROM school_teachers st
  WHERE st.employee_code IS NULL
),
updated AS (
  UPDATE school_teachers st
  SET employee_code = 'TCH-' || LPAD(n.rn::text, 6, '0')
  FROM numbered n
  WHERE st.id = n.id
  RETURNING n.rn
)
UPDATE teacher_code_global_sequence
SET last_value = GREATEST(
  last_value,
  COALESCE((SELECT MAX(rn) FROM updated), 0)
)
WHERE id = 1;

-- Sync users.username with employee_code where missing
UPDATE users u
SET username = st.employee_code
FROM school_teachers st
WHERE st.user_id = u.id
  AND st.employee_code IS NOT NULL
  AND (u.username IS NULL OR u.username = '');

ALTER TABLE school_teachers ALTER COLUMN employee_code SET NOT NULL;
ALTER TABLE school_teachers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE school_teachers ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE school_teachers ALTER COLUMN full_name SET NOT NULL;

ALTER TABLE school_teachers DROP CONSTRAINT IF EXISTS school_teachers_school_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS school_teachers_employee_code_uidx
  ON school_teachers (employee_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_teachers_school_national_uidx
  ON school_teachers (school_id, national_id)
  WHERE national_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_school_teachers_status ON school_teachers (school_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_school_teachers_phone ON school_teachers (school_id, phone) WHERE deleted_at IS NULL;

-- Teacher assignments: teacher teaches subject in classroom for academic year
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years (id) ON DELETE RESTRICT,
  teacher_id INTEGER NOT NULL REFERENCES school_teachers (id) ON DELETE CASCADE,
  grade_id INTEGER NOT NULL REFERENCES school_grades (id) ON DELETE RESTRICT,
  classroom_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE RESTRICT,
  subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_unique_active
  ON teacher_assignments (school_id, academic_year_id, teacher_id, grade_id, classroom_id, subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school ON teacher_assignments (school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments (teacher_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject ON teacher_assignments (subject_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_classroom ON teacher_assignments (classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_grade ON teacher_assignments (grade_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_year ON teacher_assignments (academic_year_id) WHERE deleted_at IS NULL;

-- Migrate legacy teacher-class links into assignments (one row per class using teacher.subject_id)
INSERT INTO teacher_assignments (
  school_id, academic_year_id, teacher_id, grade_id, classroom_id, subject_id
)
SELECT
  t.school_id,
  ay.id,
  t.id,
  c.grade_id,
  stc.class_id,
  t.subject_id
FROM school_teacher_classes stc
JOIN school_teachers t ON t.id = stc.teacher_id
JOIN school_classes c ON c.id = stc.class_id
JOIN school_grades g ON g.id = c.grade_id AND g.school_id = t.school_id
JOIN LATERAL (
  SELECT ay2.id
  FROM academic_years ay2
  WHERE ay2.school_id = t.school_id
  ORDER BY ay2.is_current DESC, ay2.start_date DESC
  LIMIT 1
) ay ON TRUE
WHERE t.subject_id IS NOT NULL
  AND t.deleted_at IS NULL
ON CONFLICT DO NOTHING;
