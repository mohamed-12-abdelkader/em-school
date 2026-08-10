-- Global subjects + school teachers + class-subject mapping + schedule slots
-- Multi-tenant:
--   - subjects are global (no school_id)
--   - teachers/classes/schedule are scoped to a specific school (users.id where role='school')

-- Global subjects
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class <-> Subjects (Many-to-Many)
-- Store as school-scoped mapping by referencing school_classes.
CREATE TABLE IF NOT EXISTS school_class_subjects (
  class_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_class_subjects_pk PRIMARY KEY (class_id, subject_id)
);

-- Teachers scoped to a school
CREATE TABLE IF NOT EXISTS school_teachers (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_teachers_school_name_unique UNIQUE (school_id, name)
);

-- Teacher <-> Classes (Many-to-Many)
CREATE TABLE IF NOT EXISTS school_teacher_classes (
  teacher_id INTEGER NOT NULL REFERENCES school_teachers (id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_teacher_classes_pk PRIMARY KEY (teacher_id, class_id)
);

-- Schedule slots
CREATE TABLE IF NOT EXISTS school_schedule_slots (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  period SMALLINT NOT NULL CHECK (period >= 1 AND period <= 20),
  subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE RESTRICT,
  teacher_id INTEGER NOT NULL REFERENCES school_teachers (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Avoid duplicate class slot
  CONSTRAINT school_schedule_unique_class_slot UNIQUE (class_id, day_of_week, period),

  -- Avoid teacher conflict (teacher can't teach two classes at the same time)
  CONSTRAINT school_schedule_unique_teacher_slot UNIQUE (teacher_id, day_of_week, period)
);

CREATE INDEX IF NOT EXISTS idx_school_schedule_school_id ON school_schedule_slots (school_id);
CREATE INDEX IF NOT EXISTS idx_school_schedule_class_id ON school_schedule_slots (class_id);
CREATE INDEX IF NOT EXISTS idx_school_schedule_teacher_id ON school_schedule_slots (teacher_id);

CREATE INDEX IF NOT EXISTS idx_school_teachers_school_id ON school_teachers (school_id);
