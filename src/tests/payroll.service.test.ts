import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/payroll.model', () => ({
  resolveStaffUserId: vi.fn(),
  upsertBasicSalary: vi.fn(),
  insertPayment: vi.fn(),
  listPayments: vi.fn(),
  insertAdjustment: vi.fn(),
}));

import * as payrollModel from '../models/payroll.model';
import * as payrollService from '../services/payroll.service';
import { HttpError } from '../utils';

describe('payroll.service (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upsertBasicSalary returns staffId + basicSalary', async () => {
    vi.mocked(payrollModel.resolveStaffUserId).mockResolvedValue(42);
    vi.mocked(payrollModel.upsertBasicSalary).mockResolvedValue({
      id: 1,
      school_id: 7,
      staff_user_id: 42,
      basic_salary: '3500.00',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(payrollService.upsertBasicSalary(7, 42, 3500)).resolves.toEqual({
      staffId: 42,
      basicSalary: 3500,
    });
  });

  it('upsertBasicSalary 404 when staff is not in school', async () => {
    vi.mocked(payrollModel.resolveStaffUserId).mockResolvedValue(null);
    await expect(payrollService.upsertBasicSalary(7, 99, 1000)).rejects.toBeInstanceOf(HttpError);
  });

  it('recordSalaryPayment returns immutable payment shape', async () => {
    vi.mocked(payrollModel.resolveStaffUserId).mockResolvedValue(42);
    vi.mocked(payrollModel.insertPayment).mockResolvedValue({
      id: 9,
      school_id: 7,
      staff_user_id: 42,
      amount: '3500.00',
      paid_at: '2026-08-01',
      note: 'August',
      created_at: new Date(),
    });

    await expect(
      payrollService.recordSalaryPayment(7, 42, {
        amount: 3500,
        paidAt: '2026-08-01',
        note: 'August',
      }),
    ).resolves.toEqual({
      id: 9,
      amount: 3500,
      paidAt: '2026-08-01',
      note: 'August',
    });
  });

  it('listSalaryPayments wraps rows in data[]', async () => {
    vi.mocked(payrollModel.resolveStaffUserId).mockResolvedValue(42);
    vi.mocked(payrollModel.listPayments).mockResolvedValue([
      {
        id: 9,
        school_id: 7,
        staff_user_id: 42,
        amount: '3500.00',
        paid_at: '2026-08-01',
        note: null,
        created_at: new Date(),
      },
    ]);

    const result = await payrollService.listSalaryPayments(7, 42);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 9, amount: 3500, paidAt: '2026-08-01' });
  });

  it('recordSalaryAdjustment returns bonus/deduction record', async () => {
    vi.mocked(payrollModel.resolveStaffUserId).mockResolvedValue(42);
    vi.mocked(payrollModel.insertAdjustment).mockResolvedValue({
      id: 3,
      school_id: 7,
      staff_user_id: 42,
      type: 'bonus',
      amount: '200.00',
      note: 'Eid',
      created_at: new Date('2026-08-01'),
    });

    const result = await payrollService.recordSalaryAdjustment(7, 42, {
      type: 'bonus',
      amount: 200,
      note: 'Eid',
    });
    expect(result).toMatchObject({
      id: 3,
      staffId: 42,
      type: 'bonus',
      amount: 200,
      note: 'Eid',
    });
  });
});
