import type { TeacherAssignmentExpandedRow } from '../types/schoolSubjectsTeachers';

export function toTeacherAssignmentResource(row: TeacherAssignmentExpandedRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    academicYearId: row.academic_year_id,
    academicYearName: row.academic_year_name,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherEmployeeCode: row.teacher_employee_code,
    gradeId: row.grade_id,
    gradeName: row.grade_name,
    classroomId: row.classroom_id,
    classroomName: row.classroom_name,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
