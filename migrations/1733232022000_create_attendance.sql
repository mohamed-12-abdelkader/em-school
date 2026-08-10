-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES group_students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_group_date ON attendance(group_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);


