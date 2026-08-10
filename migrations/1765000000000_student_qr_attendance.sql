-- Student public ID, QR payload, login codes denormalized, grade label
-- Attendance records for scan-based check-in
-- First-login password change flag on users

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE students ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_login_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_login_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Backfill legacy rows
UPDATE students s
SET student_id = 'STU-' || s.school_id || '-' || LPAD(s.id::text, 8, '0')
WHERE s.student_id IS NULL;

UPDATE students s
SET grade = g.name
FROM school_classes c
JOIN school_grades g ON g.id = c.grade_id
WHERE c.id = s.class_id
  AND g.school_id = s.school_id
  AND (s.grade IS NULL OR s.grade = '');

UPDATE students s
SET student_login_code = u.username
FROM users u
WHERE s.user_id = u.id AND s.student_login_code IS NULL;

UPDATE students s
SET parent_login_code = pu.username
FROM parent_students ps
JOIN parents p ON p.id = ps.parent_id
JOIN users pu ON pu.id = p.user_id
WHERE ps.student_id = s.id
  AND p.school_id = s.school_id
  AND s.parent_login_code IS NULL;

UPDATE students s
SET qr_code = json_build_object(
  'v', 1,
  'schoolId', s.school_id,
  'studentId', s.student_id
)::text
WHERE s.qr_code IS NULL AND s.student_id IS NOT NULL;

ALTER TABLE students ALTER COLUMN student_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_school_student_id_uidx
  ON students (school_id, student_id);

-- اسم منفصل عن جدول `attendance` القديم (شؤون طلاب / مجموعات) الذي يستخدم أعمدة مختلفة
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  student_internal_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_attendance_one_per_student_per_day UNIQUE (school_id, student_internal_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS student_attendance_school_date_idx ON student_attendance (school_id, attendance_date);
CREATE INDEX IF NOT EXISTS student_attendance_student_internal_idx ON student_attendance (student_internal_id);
