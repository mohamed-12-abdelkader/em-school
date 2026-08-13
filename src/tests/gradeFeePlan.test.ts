import { describe, expect, it } from 'vitest';
import { splitEqualInstallments, toFeePlanResource } from '../resources/gradeFeePlan.resource';
import {
  normalizeFeePlanBody,
  upsertGradeFeePlanSchema,
} from '../validators/gradeFeePlan.validator';

describe('grade fee plan shapes', () => {
  it('accepts spec PUT body { totalAmount, installmentsCount }', () => {
    const parsed = upsertGradeFeePlanSchema.safeParse(
      normalizeFeePlanBody({ totalAmount: 12000, installmentsCount: 3 }),
    );
    expect(parsed.success).toBe(true);
  });

  it('accepts snake_case aliases', () => {
    const parsed = upsertGradeFeePlanSchema.safeParse(
      normalizeFeePlanBody({ total_amount: 9000, installments_count: 2 }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.totalAmount).toBe(9000);
      expect(parsed.data.installmentsCount).toBe(2);
    }
  });

  it('still accepts detailed installments schedule', () => {
    const parsed = upsertGradeFeePlanSchema.safeParse({
      totalAmount: 12000,
      installments: [
        { dueDate: '2026-09-01', amount: 4000 },
        { dueDate: '2026-12-01', amount: 4000 },
        { dueDate: '2027-03-01', amount: 4000 },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects when neither count nor installments provided', () => {
    expect(upsertGradeFeePlanSchema.safeParse({ totalAmount: 1000 }).success).toBe(false);
  });

  it('splits total evenly and last row absorbs remainder', () => {
    const rows = splitEqualInstallments(10000, 3, '2026-09-01');
    expect(rows).toHaveLength(3);
    const sum = rows.reduce((a, x) => a + x.amount, 0);
    expect(sum).toBeCloseTo(10000, 2);
    expect(rows[0]?.dueDate).toBe('2026-09-01');
    expect(rows[1]?.dueDate).toBe('2026-10-01');
    expect(rows[2]?.dueDate).toBe('2026-11-01');
  });

  it('GET resource matches spec fields', () => {
    const empty = toFeePlanResource(4, null, []);
    expect(empty).toMatchObject({ gradeId: 4, totalAmount: null, installmentsCount: 0 });

    const filled = toFeePlanResource(
      4,
      {
        id: 10,
        school_id: 1,
        grade_id: 4,
        total_amount: '12000.00',
        created_at: new Date(),
        updated_at: new Date(),
      },
      [
        {
          id: 1,
          plan_id: 10,
          installment_number: 1,
          due_date: '2026-09-01',
          amount: '4000.00',
        },
      ],
    );
    expect(filled).toMatchObject({
      gradeId: 4,
      totalAmount: 12000,
      installmentsCount: 1,
    });
  });
});
