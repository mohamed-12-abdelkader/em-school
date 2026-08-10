-- Students inside groups
CREATE TABLE IF NOT EXISTS group_students (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  student_code TEXT,
  qr_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_students_group_id ON group_students(group_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_group_students_qr_code ON group_students(qr_code);

CREATE OR REPLACE FUNCTION set_group_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_students_updated_at ON group_students;
CREATE TRIGGER trg_group_students_updated_at
BEFORE UPDATE ON group_students
FOR EACH ROW
EXECUTE FUNCTION set_group_students_updated_at();


