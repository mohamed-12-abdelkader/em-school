export type StudentStatus = 'active' | 'suspended' | 'graduated' | 'transferred';
export type StudentRelationship = 'father' | 'mother' | 'guardian' | 'other';

export interface StudentRow {
  id: number;
  school_id: number;
  academic_year_id: number;
  grade_id: number;
  /** Classroom FK (school_classes.id) */
  class_id: number;
  /** Public unique code e.g. ST-2026-000001 — also used as login username / QR studentId */
  student_code: string;
  /** Legacy alias kept in sync with student_code for QR/attendance */
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: 'male' | 'female';
  /** birth_date */
  date_of_birth: string;
  national_id: string | null;
  /** photo */
  avatar_url: string | null;
  address: string | null;
  parent_name: string;
  parent_phone: string | null;
  parent_email: string | null;
  relationship: StudentRelationship;
  /** student_phone */
  phone: string | null;
  status: StudentStatus;
  /** Denormalized grade label for display / QR */
  grade: string | null;
  student_login_code: string | null;
  parent_login_code: string | null;
  qr_code: string | null;
  email: string | null;
  user_id: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentDetailRelations {
  academicYear: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
  } | null;
  grade: {
    id: number;
    name: string;
    stage: string;
  } | null;
  classroom: {
    id: number;
    name: string;
    capacity: number | null;
  } | null;
  parent: {
    name: string;
    phone: string | null;
    email: string | null;
    relationship: StudentRelationship;
  };
}

export interface ParentRow {
  id: number;
  school_id: number;
  full_name: string;
  phone: string;
  email: string | null;
  relation: 'father' | 'mother' | 'other';
  user_id: number | null;
  created_at: Date;
  updated_at: Date;
}
