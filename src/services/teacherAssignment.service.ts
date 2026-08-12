import * as academicYearModel from '../models/academicYear.model';
import * as schoolClassModel from '../models/schoolClass.model';
import * as schoolGradeModel from '../models/schoolGrade.model';
import * as classSubjectModel from '../models/schoolClassSubject.model';
import * as subjectModel from '../models/subject.model';
import * as teacherModel from '../models/schoolTeacher.model';
import * as teacherClassModel from '../models/schoolTeacherClass.model';
import * as assignmentModel from '../models/teacherAssignment.model';
import { toTeacherAssignmentResource } from '../resources/teacherAssignment.resource';
import { HttpError } from '../utils';

async function assertAssignmentScope(input: {
  schoolId: number;
  academicYearId: number;
  teacherId: number;
  gradeId: number;
  classroomId: number;
  subjectId: number;
}) {
  const teacher = await teacherModel.findByIdAndSchool(input.teacherId, input.schoolId);
  if (!teacher) throw new HttpError(400, 'المدرس غير موجود داخل هذه المدرسة');

  const year = await academicYearModel.findByIdAndSchool(input.academicYearId, input.schoolId);
  if (!year) throw new HttpError(400, 'السنة الدراسية غير موجودة داخل هذه المدرسة');

  const grade = await schoolGradeModel.findByIdAndSchool(input.gradeId, input.schoolId);
  if (!grade) throw new HttpError(400, 'الصف الدراسي غير موجود داخل هذه المدرسة');

  const classroom = await schoolClassModel.findByIdAndSchool(input.classroomId, input.schoolId);
  if (!classroom) throw new HttpError(400, 'الفصل غير موجود داخل هذه المدرسة');
  if (classroom.grade_id !== input.gradeId) {
    throw new HttpError(400, 'الفصل لا يتبع الصف الدراسي المحدد');
  }

  const subject = await subjectModel.findById(input.subjectId);
  if (!subject) throw new HttpError(400, 'المادة غير موجودة');

  const subjectInClass = await classSubjectModel.classHasSubject(
    input.classroomId,
    input.schoolId,
    input.subjectId,
  );
  if (!subjectInClass) {
    throw new HttpError(400, 'المادة غير مفعّلة لهذا الفصل');
  }
}

async function syncTeacherClassLink(
  schoolId: number,
  teacherId: number,
  classroomId: number,
  mode: 'add' | 'remove',
) {
  if (mode === 'add') {
    await teacherClassModel.insertMany(teacherId, [classroomId]);
    return;
  }
  const remaining = await assignmentModel.countTeacherClassroomAssignments(
    schoolId,
    teacherId,
    classroomId,
  );
  if (remaining === 0) {
    await teacherClassModel.remove(teacherId, classroomId);
  }
}

export async function listAssignments(
  schoolId: number,
  options: {
    limit: number;
    skip: number;
    teacherId?: number;
    academicYearId?: number;
    gradeId?: number;
    classroomId?: number;
    subjectId?: number;
    q?: string;
  },
) {
  const filters = {
    teacherId: options.teacherId,
    academicYearId: options.academicYearId,
    gradeId: options.gradeId,
    classroomId: options.classroomId,
    subjectId: options.subjectId,
    q: options.q,
  };
  const [rows, total] = await Promise.all([
    assignmentModel.listBySchool(schoolId, options.limit, options.skip, filters),
    assignmentModel.countBySchool(schoolId, filters),
  ]);

  return {
    assignments: rows.map(toTeacherAssignmentResource),
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + rows.length < total,
    },
  };
}

export async function getAssignment(assignmentId: number, schoolId: number) {
  const row = await assignmentModel.findByIdAndSchool(assignmentId, schoolId);
  if (!row) throw new HttpError(404, 'Assignment not found');
  return toTeacherAssignmentResource(row);
}

export async function createAssignment(
  schoolId: number,
  input: {
    academicYearId: number;
    teacherId: number;
    gradeId: number;
    classroomId: number;
    subjectId: number;
  },
) {
  await assertAssignmentScope({ schoolId, ...input });

  const duplicate = await assignmentModel.hasActiveAssignment({
    schoolId,
    teacherId: input.teacherId,
    classroomId: input.classroomId,
    subjectId: input.subjectId,
    academicYearId: input.academicYearId,
  });
  if (duplicate) {
    throw new HttpError(409, 'هذا التوزيع موجود بالفعل');
  }

  try {
    const row = await assignmentModel.insert({ schoolId, ...input });
    await syncTeacherClassLink(schoolId, input.teacherId, input.classroomId, 'add');
    return toTeacherAssignmentResource(row);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'هذا التوزيع موجود بالفعل');
    throw e;
  }
}

export async function updateAssignment(
  assignmentId: number,
  schoolId: number,
  patch: {
    academicYearId?: number;
    teacherId?: number;
    gradeId?: number;
    classroomId?: number;
    subjectId?: number;
  },
) {
  const existing = await assignmentModel.findByIdAndSchool(assignmentId, schoolId);
  if (!existing) throw new HttpError(404, 'Assignment not found');

  const next = {
    academicYearId: patch.academicYearId ?? existing.academic_year_id,
    teacherId: patch.teacherId ?? existing.teacher_id,
    gradeId: patch.gradeId ?? existing.grade_id,
    classroomId: patch.classroomId ?? existing.classroom_id,
    subjectId: patch.subjectId ?? existing.subject_id,
  };

  await assertAssignmentScope({ schoolId, ...next });

  const duplicate = await assignmentModel.hasActiveAssignment({
    schoolId,
    teacherId: next.teacherId,
    classroomId: next.classroomId,
    subjectId: next.subjectId,
    academicYearId: next.academicYearId,
    excludeAssignmentId: assignmentId,
  });
  if (duplicate) throw new HttpError(409, 'هذا التوزيع موجود بالفعل');

  const oldTeacherId = existing.teacher_id;
  const oldClassroomId = existing.classroom_id;

  try {
    const row = await assignmentModel.update(assignmentId, schoolId, patch);
    if (!row) throw new HttpError(404, 'Assignment not found');

    await syncTeacherClassLink(schoolId, next.teacherId, next.classroomId, 'add');
    if (oldTeacherId !== next.teacherId || oldClassroomId !== next.classroomId) {
      await syncTeacherClassLink(schoolId, oldTeacherId, oldClassroomId, 'remove');
    }

    return toTeacherAssignmentResource(row);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'هذا التوزيع موجود بالفعل');
    throw e;
  }
}

export async function deleteAssignment(assignmentId: number, schoolId: number) {
  const existing = await assignmentModel.findByIdAndSchool(assignmentId, schoolId);
  if (!existing) throw new HttpError(404, 'Assignment not found');

  const ok = await assignmentModel.softDelete(assignmentId, schoolId);
  if (!ok) throw new HttpError(404, 'Assignment not found');

  await syncTeacherClassLink(schoolId, existing.teacher_id, existing.classroom_id, 'remove');
}

export async function listAssignmentsForTeacherUser(schoolId: number, teacherId: number) {
  const rows = await assignmentModel.listByTeacher(schoolId, teacherId);
  return rows.map(toTeacherAssignmentResource);
}
