-- مصروفات على مستوى الصف الدراسي + جدول أقساط قالب لكل طالب

CREATE TABLE IF NOT EXISTS grade_fee_plans (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  grade_id INTEGER NOT NULL REFERENCES school_grades (id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grade_fee_plans_school_grade_unique UNIQUE (school_id, grade_id)
);

CREATE TABLE IF NOT EXISTS grade_fee_plan_installments (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES grade_fee_plans (id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  CONSTRAINT grade_fee_plan_installments_plan_seq_unique UNIQUE (plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_grade_fee_plans_school_grade ON grade_fee_plans (school_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_grade_fee_plan_installments_plan ON grade_fee_plan_installments (plan_id);

ALTER TABLE fees ADD COLUMN IF NOT EXISTS grade_fee_plan_id INTEGER REFERENCES grade_fee_plans (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fees_grade_fee_plan ON fees (grade_fee_plan_id);
