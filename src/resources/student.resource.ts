import type { StudentRow, StudentRelationship, StudentStatus } from '../types/studentAffairs';

/** API resource shape (camelCase + explicit field names from module spec) */
export function toStudentResource(row: StudentRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    academicYearId: row.academic_year_id,
    gradeId: row.grade_id,
    classroomId: row.class_id,
    studentCode: row.student_code,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    gender: row.gender,
    birthDate: row.date_of_birth,
    nationalId: row.national_id,
    photo: row.avatar_url,
    address: row.address,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    parentEmail: row.parent_email,
    relationship: row.relationship as StudentRelationship,
    studentPhone: row.phone,
    status: row.status as StudentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // legacy / companion fields used by QR & attendance
    studentId: row.student_id,
    gradeLabel: row.grade,
    qrCode: row.qr_code,
    userId: row.user_id,
  };
}
