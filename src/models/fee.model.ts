import pool from '../db/pool';
import type {
  FeeRow,
  GradeFeePlanInstallmentRow,
  GradeFeePlanRow,
  InstallmentRow,
} from '../types/gradeFeePlan';

export async function findLatestFeeByStudent(studentId: number): Promise<FeeRow | null> {
  const r = await pool.query<FeeRow>(
    `SELECT id, student_id, total_amount::text, paid_amount::text, remaining_amount::text,
            grade_fee_plan_id, created_at, updated_at
     FROM fees
     WHERE student_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [studentId],
  );
  return r.rows[0] ?? null;
}

export async function deleteFeeCascade(feeId: number): Promise<void> {
  await pool.query(`DELETE FROM fees WHERE id = $1`, [feeId]);
}

export async function insertFee(input: {
  studentId: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  gradeFeePlanId: number;
}): Promise<number> {
  const r = await pool.query<{ id: number }>(
    `INSERT INTO fees (student_id, total_amount, paid_amount, remaining_amount, grade_fee_plan_id, updated_at)
     VALUES ($1, $2::numeric, $3::numeric, $4::numeric, $5, NOW())
     RETURNING id`,
    [
      input.studentId,
      input.totalAmount,
      input.paidAmount,
      input.remainingAmount,
      input.gradeFeePlanId,
    ],
  );
  const id = r.rows[0]?.id;
  if (!id) throw new Error('insertFee failed');
  return id;
}

export async function insertInstallment(input: {
  feeId: number;
  amount: string;
  dueDate: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO installments (fee_id, amount, due_date, status)
     VALUES ($1, $2::numeric, $3::date, 'unpaid')`,
    [input.feeId, input.amount, input.dueDate],
  );
}

/** إنشاء سجل رسوم + أقساط من قالب الصف (معاملة واحدة) */
export async function createFeeFromPlanTemplate(
  studentId: number,
  plan: GradeFeePlanRow,
  schedules: GradeFeePlanInstallmentRow[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const feeR = await client.query<{ id: number }>(
      `INSERT INTO fees (student_id, total_amount, paid_amount, remaining_amount, grade_fee_plan_id, updated_at)
       VALUES ($1, $2::numeric, 0, $2::numeric, $3, NOW())
       RETURNING id`,
      [studentId, plan.total_amount, plan.id],
    );
    const feeId = feeR.rows[0]?.id;
    if (!feeId) throw new Error('createFeeFromPlanTemplate: no fee id');

    for (const s of schedules) {
      await client.query(
        `INSERT INTO installments (fee_id, amount, due_date, status)
         VALUES ($1, $2::numeric, $3::date, 'unpaid')`,
        [feeId, s.amount, s.due_date],
      );
    }
    await client.query('COMMIT');
    return feeId;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export async function listInstallmentsByFeeId(feeId: number): Promise<InstallmentRow[]> {
  const r = await pool.query<InstallmentRow>(
    `SELECT id, fee_id, amount::text, due_date::text, status, paid_at, created_at
     FROM installments
     WHERE fee_id = $1
     ORDER BY due_date ASC, id ASC`,
    [feeId],
  );
  return r.rows;
}

export async function getFeeWithInstallmentsForSchool(
  studentId: number,
  schoolId: number,
): Promise<{ fee: FeeRow; installments: InstallmentRow[] } | null> {
  const feeR = await pool.query<FeeRow>(
    `SELECT f.id, f.student_id, f.total_amount::text, f.paid_amount::text, f.remaining_amount::text,
            f.grade_fee_plan_id, f.created_at, f.updated_at
     FROM fees f
     JOIN students s ON s.id = f.student_id
     WHERE f.student_id = $1 AND s.school_id = $2
     ORDER BY f.id DESC
     LIMIT 1`,
    [studentId, schoolId],
  );
  const fee = feeR.rows[0];
  if (!fee) return null;
  const installments = await listInstallmentsByFeeId(fee.id);
  return { fee, installments };
}

/** تسديد قسط + تحديث إجمالي الرسوم */
export async function markInstallmentPaid(
  installmentId: number,
  schoolId: number,
): Promise<{ feeId: number; studentId: number; installmentAmount: string } | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lock = await client.query<{
      iid: number;
      fee_id: number;
      inst_amount: string;
      student_id: number;
      status: string;
    }>(
      `SELECT i.id AS iid, i.fee_id, i.amount::text AS inst_amount, f.student_id, i.status
       FROM installments i
       JOIN fees f ON f.id = i.fee_id
       JOIN students s ON s.id = f.student_id
       WHERE i.id = $1 AND s.school_id = $2
       FOR UPDATE OF i, f`,
      [installmentId, schoolId],
    );
    const row = lock.rows[0];
    if (!row || row.status !== 'unpaid') {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(`UPDATE installments SET status = 'paid', paid_at = NOW() WHERE id = $1`, [
      installmentId,
    ]);

    const feeR = await client.query<{
      total: string;
      paid: string;
      remaining: string;
    }>(
      `SELECT total_amount::text AS total, paid_amount::text AS paid, remaining_amount::text AS remaining
       FROM fees WHERE id = $1 FOR UPDATE`,
      [row.fee_id],
    );
    const f = feeR.rows[0];
    if (!f) {
      await client.query('ROLLBACK');
      return null;
    }

    const paid = Number(f.paid) + Number(row.inst_amount);
    const total = Number(f.total);
    const remaining = total - paid;
    if (remaining < -0.01) {
      await client.query('ROLLBACK');
      throw new Error('Overpayment');
    }

    await client.query(
      `UPDATE fees SET paid_amount = $1::numeric, remaining_amount = $2::numeric, updated_at = NOW()
       WHERE id = $3`,
      [paid.toFixed(2), remaining.toFixed(2), row.fee_id],
    );

    await client.query('COMMIT');
    return { feeId: row.fee_id, studentId: row.student_id, installmentAmount: row.inst_amount };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
