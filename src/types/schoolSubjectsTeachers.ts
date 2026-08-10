export type SubjectId = number;
export type TeacherStatus = 'active' | 'suspended';

export interface SubjectRow {
  id: number;
  name: string;
  description: string | null;
}

export interface SchoolTeacherRow {
  id: number;
  school_id: number;
  user_id: number | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  photo: string | null;
  gender: 'male' | 'female' | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  address: string | null;
  hire_date: string | null;
  specialization: string | null;
  status: TeacherStatus;
  /** legacy — optional primary subject */
  name: string;
  description: string | null;
  subject_id: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TeacherAssignmentRow {
  id: number;
  school_id: number;
  academic_year_id: number;
  teacher_id: number;
  grade_id: number;
  classroom_id: number;
  subject_id: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TeacherAssignmentExpandedRow extends TeacherAssignmentRow {
  academic_year_name: string;
  teacher_name: string;
  teacher_employee_code: string;
  grade_name: string;
  classroom_name: string;
  subject_name: string;
}

export interface TeacherClassRow {
  teacher_id: number;
  class_id: number;
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ScheduleSlotRow {
  id: number;
  school_id: number;
  class_id: number;
  day_of_week: DayOfWeek;
  period: number;
  subject_id: number;
  teacher_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleSlotExpandedRow {
  id: number;
  school_id: number;
  class_id: number;
  day_of_week: DayOfWeek;
  period: number;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
}
