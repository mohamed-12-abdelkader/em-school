import type { SchoolTeacherRow, TeacherStatus } from '../types/schoolSubjectsTeachers';

export function toTeacherResource(row: SchoolTeacherRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    photo: row.photo,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    nationalId: row.national_id,
    address: row.address,
    hireDate: row.hire_date,
    specialization: row.specialization,
    status: row.status as TeacherStatus,
    legacySubjectId: row.subject_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
