-- Add grade_id to groups (optional, references grades)
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES grades(id);

CREATE INDEX IF NOT EXISTS idx_groups_grade_id ON groups(grade_id);


