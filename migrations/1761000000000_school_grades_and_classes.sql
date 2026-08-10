-- School-scoped grades & classes (multi-tenant per school user)

CREATE TYPE grade_stage AS ENUM ('primary', 'preparatory', 'secondary');

CREATE TABLE school_grades (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage grade_stage NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_grades_school_name_unique UNIQUE (school_id, name)
);

CREATE TABLE school_classes (
    id SERIAL PRIMARY KEY,
    grade_id INTEGER NOT NULL REFERENCES school_grades (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_classes_grade_name_unique UNIQUE (grade_id, name)
);

CREATE INDEX idx_school_grades_school_id ON school_grades (school_id);
CREATE INDEX idx_school_classes_grade_id ON school_classes (grade_id);
