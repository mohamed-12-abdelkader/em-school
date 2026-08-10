-- Student Affairs System (school-scoped)

-- 1) Add parent role to user_role enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'parent'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'parent';
  END IF;
END $$;

-- 2) Add username for login (unique, optional)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 3) Parents (school scoped)
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relation TEXT NOT NULL CHECK (relation IN ('father', 'mother', 'other')),
  user_id INTEGER UNIQUE NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parents_school_phone_unique UNIQUE (school_id, phone)
);

-- If `parents` table existed before, ensure required columns exist
ALTER TABLE parents ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS relation TEXT CHECK (relation IN ('father', 'mother', 'other'));
ALTER TABLE parents ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4) Students (school scoped, must belong to a class)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  address TEXT,
  phone TEXT,
  parent_phone TEXT,
  email TEXT,
  avatar_url TEXT,
  user_id INTEGER UNIQUE NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT students_school_national_unique UNIQUE (school_id, national_id)
);

-- If `students` table existed before, ensure required columns exist (so indexes won't fail)
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES school_classes (id) ON DELETE RESTRICT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5) Parent <-> Students (siblings)
CREATE TABLE IF NOT EXISTS parent_students (
  parent_id INTEGER NOT NULL REFERENCES parents (id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

-- 6) Student documents
CREATE TABLE IF NOT EXISTS student_documents (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('avatar', 'birth_certificate', 'document')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) Attendance (unique per student per day)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  recorded_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_unique_student_day UNIQUE (student_id, date)
);

-- If `attendance` table existed before, ensure required columns exist
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES school_classes (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('present', 'absent', 'late'));
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 8) Fees
CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) NOT NULL CHECK (remaining_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fees_amounts_check CHECK (paid_amount + remaining_amount = total_amount)
);

-- 9) Installments
CREATE TABLE IF NOT EXISTS installments (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER NOT NULL REFERENCES fees (id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10) Student grades (avoid conflict with existing grades table)
CREATE TABLE IF NOT EXISTS student_grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('quiz', 'midterm', 'final')),
  score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11) Notes / Reports
CREATE TABLE IF NOT EXISTS student_notes (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_school_class ON students (school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_parents_school ON parents (school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_class_date ON attendance (school_id, class_id, date);
CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents (student_id);
