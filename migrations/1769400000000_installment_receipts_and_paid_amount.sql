-- Partial payments + immutable cash receipt vouchers.
-- Public status (upcoming|due|overdue|paid) is derived from paid/unpaid + due_date.

ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  CHECK (paid_amount >= 0);

UPDATE installments
SET paid_amount = amount
WHERE status = 'paid' AND paid_amount = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installments_paid_amount_le_amount'
  ) THEN
    ALTER TABLE installments
      ADD CONSTRAINT installments_paid_amount_le_amount CHECK (paid_amount <= amount);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  installment_id INTEGER NOT NULL REFERENCES installments (id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_installment ON payment_receipts (installment_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_school ON payment_receipts (school_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_installments_unpaid_due ON installments (due_date)
  WHERE status = 'unpaid';
