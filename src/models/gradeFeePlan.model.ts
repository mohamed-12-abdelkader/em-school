import pool from '../db/pool';
import type { GradeFeePlanInstallmentRow, GradeFeePlanRow } from '../types/gradeFeePlan';

export async function findPlanByGrade(
  schoolId: number,
  gradeId: number,
): Promise<GradeFeePlanRow | null> {
  const r = await pool.query<GradeFeePlanRow>(
    `SELECT id, school_id, grade_id, total_amount::text, created_at, updated_at
     FROM grade_fee_plans
     WHERE school_id = $1 AND grade_id = $2`,
    [schoolId, gradeId],
  );
  return r.rows[0] ?? null;
}

export async function upsertPlan(
  schoolId: number,
  gradeId: number,
  totalAmount: string,
): Promise<GradeFeePlanRow> {
  const r = await pool.query<GradeFeePlanRow>(
    `INSERT INTO grade_fee_plans (school_id, grade_id, total_amount, updated_at)
     VALUES ($1, $2, $3::numeric, NOW())
     ON CONFLICT (school_id, grade_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       updated_at = NOW()
     RETURNING id, school_id, grade_id, total_amount::text, created_at, updated_at`,
    [schoolId, gradeId, totalAmount],
  );
  return r.rows[0]!;
}

export async function deleteInstallmentsForPlan(planId: number): Promise<void> {
  await pool.query(`DELETE FROM grade_fee_plan_installments WHERE plan_id = $1`, [planId]);
}

export async function insertPlanInstallment(input: {
  planId: number;
  installmentNumber: number;
  dueDate: string;
  amount: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO grade_fee_plan_installments (plan_id, installment_number, due_date, amount)
     VALUES ($1, $2, $3::date, $4::numeric)`,
    [input.planId, input.installmentNumber, input.dueDate, input.amount],
  );
}

export async function listPlanInstallments(planId: number): Promise<GradeFeePlanInstallmentRow[]> {
  const r = await pool.query<GradeFeePlanInstallmentRow>(
    `SELECT id, plan_id, installment_number, due_date::text, amount::text
     FROM grade_fee_plan_installments
     WHERE plan_id = $1
     ORDER BY installment_number ASC`,
    [planId],
  );
  return r.rows;
}

/** حفظ الخطة + استبدال جدول الأقساط القالب في معاملة واحدة */
export async function replacePlanWithInstallments(
  schoolId: number,
  gradeId: number,
  totalAmount: string,
  installments: { installmentNumber: number; dueDate: string; amount: string }[],
): Promise<GradeFeePlanRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pr = await client.query<GradeFeePlanRow>(
      `INSERT INTO grade_fee_plans (school_id, grade_id, total_amount, updated_at)
       VALUES ($1, $2, $3::numeric, NOW())
       ON CONFLICT (school_id, grade_id) DO UPDATE SET
         total_amount = EXCLUDED.total_amount,
         updated_at = NOW()
       RETURNING id, school_id, grade_id, total_amount::text, created_at, updated_at`,
      [schoolId, gradeId, totalAmount],
    );
    const plan = pr.rows[0]!;
    await client.query(`DELETE FROM grade_fee_plan_installments WHERE plan_id = $1`, [plan.id]);
    for (const ins of installments) {
      await client.query(
        `INSERT INTO grade_fee_plan_installments (plan_id, installment_number, due_date, amount)
         VALUES ($1, $2, $3::date, $4::numeric)`,
        [plan.id, ins.installmentNumber, ins.dueDate, ins.amount],
      );
    }
    await client.query('COMMIT');
    return plan;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
