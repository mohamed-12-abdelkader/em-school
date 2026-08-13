export type SalaryAdjustmentType = 'bonus' | 'deduction';

export interface StaffSalaryRow {
  id: number;
  school_id: number;
  staff_user_id: number;
  basic_salary: string;
  created_at: Date;
  updated_at: Date;
}

export interface SalaryPaymentRow {
  id: number;
  school_id: number;
  staff_user_id: number;
  amount: string;
  paid_at: string;
  note: string | null;
  created_at: Date;
}

export interface SalaryAdjustmentRow {
  id: number;
  school_id: number;
  staff_user_id: number;
  type: SalaryAdjustmentType;
  amount: string;
  note: string | null;
  created_at: Date;
}
