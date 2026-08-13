-- Payroll: basic salary, immutable cash payments (vouchers), bonus/deduction adjustments.
-- staff_user_id is users.id (student_affairs or teacher).

CREATE TABLE IF NOT EXISTS staff_salaries (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  basic_salary NUMERIC(12, 2) NOT NULL CHECK (basic_salary >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_salaries_school_staff_unique UNIQUE (school_id, staff_user_id)
);

CREATE TABLE IF NOT EXISTS staff_salary_payments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_salary_adjustments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'deduction')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_salaries_school ON staff_salaries (school_id);
CREATE INDEX IF NOT EXISTS idx_staff_salary_payments_staff
  ON staff_salary_payments (school_id, staff_user_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_salary_adjustments_staff
  ON staff_salary_adjustments (school_id, staff_user_id, created_at DESC);
