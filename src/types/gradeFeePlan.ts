export interface GradeFeePlanRow {
  id: number;
  school_id: number;
  grade_id: number;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
}

export interface GradeFeePlanInstallmentRow {
  id: number;
  plan_id: number;
  installment_number: number;
  due_date: string;
  amount: string;
}

export interface FeeRow {
  id: number;
  student_id: number;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  grade_fee_plan_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface InstallmentRow {
  id: number;
  fee_id: number;
  amount: string;
  due_date: string;
  status: 'paid' | 'unpaid';
  paid_at: Date | null;
  created_at: Date;
}
