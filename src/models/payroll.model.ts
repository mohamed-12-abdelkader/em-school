import pool from '../db/pool';
import type {
  SalaryAdjustmentRow,
  SalaryAdjustmentType,
  SalaryPaymentRow,
  StaffSalaryRow,
} from '../types/payroll';

const SALARY_COLS = `id, school_id, staff_user_id, basic_salary::text, created_at, updated_at`;
const PAYMENT_COLS = `id, school_id, staff_user_id, amount::text, paid_at::text, note, created_at`;
const ADJUSTMENT_COLS = `id, school_id, staff_user_id, type, amount::text, note, created_at`;

/** Resolve payroll staff to a users.id scoped to this school. */
export async function resolveStaffUserId(
  schoolId: number,
  staffId: number,
): Promise<number | null> {
  const user = await pool.query<{ id: number }>(
    `SELECT id
     FROM users
     WHERE id = $1
       AND school_id = $2
       AND role IN ('student_affairs', 'teacher')
     LIMIT 1`,
    [staffId, schoolId],
  );
  if (user.rows[0]) return user.rows[0].id;

  const teacher = await pool.query<{ user_id: number | null }>(
    `SELECT user_id
     FROM school_teachers
     WHERE school_id = $1
       AND deleted_at IS NULL
       AND (id = $2 OR user_id = $2)
     LIMIT 1`,
    [schoolId, staffId],
  );
  return teacher.rows[0]?.user_id ?? null;
}

export async function upsertBasicSalary(
  schoolId: number,
  staffUserId: number,
  basicSalary: number,
): Promise<StaffSalaryRow> {
  const r = await pool.query<StaffSalaryRow>(
    `INSERT INTO staff_salaries (school_id, staff_user_id, basic_salary, updated_at)
     VALUES ($1, $2, $3::numeric, NOW())
     ON CONFLICT (school_id, staff_user_id)
     DO UPDATE SET basic_salary = EXCLUDED.basic_salary, updated_at = NOW()
     RETURNING ${SALARY_COLS}`,
    [schoolId, staffUserId, basicSalary.toFixed(2)],
  );
  return r.rows[0];
}

export async function insertPayment(input: {
  schoolId: number;
  staffUserId: number;
  amount: number;
  paidAt: string;
  note: string | null;
}): Promise<SalaryPaymentRow> {
  const r = await pool.query<SalaryPaymentRow>(
    `INSERT INTO staff_salary_payments (school_id, staff_user_id, amount, paid_at, note)
     VALUES ($1, $2, $3::numeric, $4::date, $5)
     RETURNING ${PAYMENT_COLS}`,
    [input.schoolId, input.staffUserId, input.amount.toFixed(2), input.paidAt, input.note],
  );
  return r.rows[0];
}

export async function listPayments(
  schoolId: number,
  staffUserId: number,
): Promise<SalaryPaymentRow[]> {
  const r = await pool.query<SalaryPaymentRow>(
    `SELECT ${PAYMENT_COLS}
     FROM staff_salary_payments
     WHERE school_id = $1 AND staff_user_id = $2
     ORDER BY paid_at DESC, id DESC`,
    [schoolId, staffUserId],
  );
  return r.rows;
}

export async function insertAdjustment(input: {
  schoolId: number;
  staffUserId: number;
  type: SalaryAdjustmentType;
  amount: number;
  note: string | null;
}): Promise<SalaryAdjustmentRow> {
  const r = await pool.query<SalaryAdjustmentRow>(
    `INSERT INTO staff_salary_adjustments (school_id, staff_user_id, type, amount, note)
     VALUES ($1, $2, $3, $4::numeric, $5)
     RETURNING ${ADJUSTMENT_COLS}`,
    [input.schoolId, input.staffUserId, input.type, input.amount.toFixed(2), input.note],
  );
  return r.rows[0];
}
