-- Up Migration
-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 1,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures (course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_position ON lectures (course_id, position);

-- Down Migration
DROP TABLE IF EXISTS lectures;


