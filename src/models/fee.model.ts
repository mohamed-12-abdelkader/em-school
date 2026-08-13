import pool from '../db/pool';
import type {
  FeeRow,
  GradeFeePlanInstallmentRow,
  GradeFeePlanRow,
  InstallmentRow,
  OverdueInstallmentRow,
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
    `SELECT id, fee_id, amount::text, COALESCE(paid_amount, 0)::text AS paid_amount,
            due_date::text, status, paid_at, created_at
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

export interface PayInstallmentResult {
  installment: InstallmentRow;
  voucher: {
    voucherId: number;
    amount: number;
    paidAt: string;
    receivedBy: number;
    installmentId: number;
  };
}

/** Cash pay (full or partial) + immutable receipt voucher. */
export async function payInstallment(
  installmentId: number,
  schoolId: number,
  receivedBy: number,
  amount?: number,
): Promise<PayInstallmentResult | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lock = await client.query<{
      iid: number;
      fee_id: number;
      inst_amount: string;
      paid_amount: string;
      due_date: string;
      student_id: number;
      status: string;
    }>(
      `SELECT i.id AS iid, i.fee_id, i.amount::text AS inst_amount,
              COALESCE(i.paid_amount, 0)::text AS paid_amount, i.due_date::text,
              f.student_id, i.status
       FROM installments i
       JOIN fees f ON f.id = i.fee_id
       JOIN students s ON s.id = f.student_id
       WHERE i.id = $1 AND s.school_id = $2
       FOR UPDATE OF i, f`,
      [installmentId, schoolId],
    );
    const row = lock.rows[0];
    if (!row || row.status === 'paid') {
      await client.query('ROLLBACK');
      return null;
    }

    const instAmount = Number(row.inst_amount);
    const alreadyPaid = Number(row.paid_amount);
    const remaining = Number((instAmount - alreadyPaid).toFixed(2));
    if (remaining <= 0.009) {
      await client.query('ROLLBACK');
      return null;
    }

    const payAmount = amount === undefined ? remaining : Number(amount.toFixed(2));
    if (payAmount <= 0) {
      await client.query('ROLLBACK');
      throw new Error('InvalidAmount');
    }
    if (payAmount - remaining > 0.01) {
      await client.query('ROLLBACK');
      throw new Error('Overpayment');
    }

    const newPaid = Number((alreadyPaid + payAmount).toFixed(2));
    const fullyPaid = instAmount - newPaid <= 0.01;

    await client.query(
      `UPDATE installments
       SET paid_amount = $1::numeric,
           status = $2,
           paid_at = CASE WHEN $3 THEN NOW() ELSE paid_at END
       WHERE id = $4`,
      [
        fullyPaid ? instAmount.toFixed(2) : newPaid.toFixed(2),
        fullyPaid ? 'paid' : 'unpaid',
        fullyPaid,
        installmentId,
      ],
    );

    const receipt = await client.query<{
      id: number;
      amount: string;
      paid_at: string;
    }>(
      `INSERT INTO payment_receipts (school_id, installment_id, student_id, amount, paid_at, received_by)
       VALUES ($1, $2, $3, $4::numeric, CURRENT_DATE, $5)
       RETURNING id, amount::text, paid_at::text`,
      [schoolId, installmentId, row.student_id, payAmount.toFixed(2), receivedBy],
    );
    const voucherRow = receipt.rows[0];
    if (!voucherRow) {
      await client.query('ROLLBACK');
      throw new Error('Receipt insert failed');
    }

    const feeR = await client.query<{
      total: string;
      paid: string;
    }>(
      `SELECT total_amount::text AS total, paid_amount::text AS paid
       FROM fees WHERE id = $1 FOR UPDATE`,
      [row.fee_id],
    );
    const f = feeR.rows[0];
    if (!f) {
      await client.query('ROLLBACK');
      return null;
    }

    const feePaid = Number(f.paid) + payAmount;
    const feeRemaining = Number(f.total) - feePaid;
    if (feeRemaining < -0.01) {
      await client.query('ROLLBACK');
      throw new Error('Overpayment');
    }

    await client.query(
      `UPDATE fees SET paid_amount = $1::numeric, remaining_amount = $2::numeric, updated_at = NOW()
       WHERE id = $3`,
      [feePaid.toFixed(2), Math.max(0, feeRemaining).toFixed(2), row.fee_id],
    );

    const updated = await client.query<InstallmentRow>(
      `SELECT id, fee_id, amount::text, COALESCE(paid_amount, 0)::text AS paid_amount,
              due_date::text, status, paid_at, created_at
       FROM installments WHERE id = $1`,
      [installmentId],
    );

    await client.query('COMMIT');
    return {
      installment: updated.rows[0]!,
      voucher: {
        voucherId: voucherRow.id,
        amount: Number(voucherRow.amount),
        paidAt: voucherRow.paid_at,
        receivedBy,
        installmentId,
      },
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export async function listOverdueInstallments(
  schoolId: number,
  filters: { gradeId?: number; classroomId?: number } = {},
): Promise<OverdueInstallmentRow[]> {
  const params: unknown[] = [schoolId];
  let p = 2;
  const extra: string[] = [];
  if (filters.gradeId !== undefined) {
    extra.push(`s.grade_id = $${p++}`);
    params.push(filters.gradeId);
  }
  if (filters.classroomId !== undefined) {
    extra.push(`s.class_id = $${p++}`);
    params.push(filters.classroomId);
  }

  const r = await pool.query<OverdueInstallmentRow>(
    `SELECT s.id AS student_id,
            s.full_name AS student_name,
            i.id AS installment_id,
            (i.amount - COALESCE(i.paid_amount, 0))::text AS amount,
            (i.amount - COALESCE(i.paid_amount, 0))::text AS remaining,
            i.due_date::text AS due_date
     FROM installments i
     JOIN fees f ON f.id = i.fee_id
     JOIN students s ON s.id = f.student_id
     WHERE s.school_id = $1
       AND s.deleted_at IS NULL
       AND i.status = 'unpaid'
       AND i.due_date < CURRENT_DATE
       AND (i.amount - COALESCE(i.paid_amount, 0)) > 0
       ${extra.length ? `AND ${extra.join(' AND ')}` : ''}
     ORDER BY i.due_date ASC, s.full_name ASC, i.id ASC`,
    params,
  );
  return r.rows;
}

export interface ParentChildFeeRow {
  student_id: number;
  student_name: string;
  installment_id: number | null;
  amount: string | null;
  due_date: string | null;
  status: string | null;
  paid_amount: string | null;
}

export async function listFeesForParentUser(parentUserId: number): Promise<ParentChildFeeRow[]> {
  const r = await pool.query<ParentChildFeeRow>(
    `SELECT s.id AS student_id,
            s.full_name AS student_name,
            i.id AS installment_id,
            i.amount::text AS amount,
            i.due_date::text AS due_date,
            i.status,
            COALESCE(i.paid_amount, 0)::text AS paid_amount
     FROM parents p
     JOIN parent_students ps ON ps.parent_id = p.id
     JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
     LEFT JOIN LATERAL (
       SELECT f.id
       FROM fees f
       WHERE f.student_id = s.id
       ORDER BY f.id DESC
       LIMIT 1
     ) latest ON TRUE
     LEFT JOIN installments i ON i.fee_id = latest.id
     WHERE p.user_id = $1
     ORDER BY s.id ASC, i.due_date ASC NULLS LAST, i.id ASC`,
    [parentUserId],
  );
  return r.rows;
}

/** Remaining unpaid tuition for non-deleted students in a school. */
export async function sumPendingBySchool(schoolId: number): Promise<number> {
  const r = await pool.query<{ remaining: string }>(
    `SELECT COALESCE(SUM(f.remaining_amount), 0)::text AS remaining
     FROM fees f
     JOIN students s ON s.id = f.student_id
     WHERE s.school_id = $1 AND s.deleted_at IS NULL`,
    [schoolId],
  );
  return Number(r.rows[0]?.remaining ?? 0);
}
