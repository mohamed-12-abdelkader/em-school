-- Up Migration
-- إنشاء جدول امتحانات المحاضرات
CREATE TABLE IF NOT EXISTS lecture_exams (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL, -- مدة الامتحان بالدقائق
  questions_count INTEGER NOT NULL,
  total_grade INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Down Migration
-- حذف جدول امتحانات المحاضرات
DROP TABLE IF EXISTS lecture_exams;
