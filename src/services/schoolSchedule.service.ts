import { HttpError } from '../utils';
import * as classSubjectModel from '../models/schoolClassSubject.model';
import * as teacherModel from '../models/schoolTeacher.model';
import * as scheduleSlotModel from '../models/schoolScheduleSlot.model';
import * as teacherAssignmentModel from '../models/teacherAssignment.model';
import * as teacherClassModel from '../models/schoolTeacherClass.model';

async function assertTeacherCanTeachSlot(
  schoolId: number,
  classId: number,
  teacherId: number,
  subjectId: number,
) {
  const teacher = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!teacher) throw new HttpError(404, 'Teacher not found');

  const ok = await classSubjectModel.classHasSubject(classId, schoolId, subjectId);
  if (!ok) throw new HttpError(409, 'Subject is not assigned to this class');

  const hasAssignment = await teacherAssignmentModel.hasActiveAssignment({
    schoolId,
    teacherId,
    classroomId: classId,
    subjectId,
  });
  if (hasAssignment) return;

  if (teacher.subject_id !== subjectId) {
    throw new HttpError(409, 'Teacher does not teach the selected subject in this class');
  }
  const teacherAssigned = await teacherClassModel.isTeacherAssignedToClass({
    teacherId,
    classId,
    schoolId,
  });
  if (!teacherAssigned) {
    throw new HttpError(409, 'Teacher is not assigned to this class');
  }
}

export async function listScheduleForClass(
  schoolId: number,
  classId: number,
  options: { dayOfWeek?: number },
) {
  const classSchoolId = await classSubjectModel.getClassSchoolId(classId);
  if (!classSchoolId || classSchoolId !== schoolId) throw new HttpError(404, 'Class not found');

  const dayOfWeek = options.dayOfWeek;
  return scheduleSlotModel.listByClass({
    schoolId,
    classId,
    dayOfWeek: dayOfWeek as any,
  });
}

export async function createSlot(
  schoolId: number,
  classId: number,
  input: { dayOfWeek: any; period: number; subjectId: number; teacherId: number },
) {
  const classSchoolId = await classSubjectModel.getClassSchoolId(classId);
  if (!classSchoolId || classSchoolId !== schoolId) throw new HttpError(404, 'Class not found');

  await assertTeacherCanTeachSlot(schoolId, classId, input.teacherId, input.subjectId);

  // Conflicts (pre-check for better error messages)
  const classConflict = await scheduleSlotModel.existsClassSlot({
    schoolId,
    classId,
    dayOfWeek: input.dayOfWeek,
    period: input.period,
  });
  if (classConflict)
    throw new HttpError(409, 'This class already has a slot at the same day/period');

  const teacherConflict = await scheduleSlotModel.existsTeacherSlot({
    schoolId,
    teacherId: input.teacherId,
    dayOfWeek: input.dayOfWeek,
    period: input.period,
  });
  if (teacherConflict)
    throw new HttpError(409, 'This teacher already has a slot at the same day/period');

  try {
    const slot = await scheduleSlotModel.create({
      schoolId,
      classId,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
    });
    return slot;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'Schedule conflict');
    throw e;
  }
}

export async function updateSlot(
  schoolId: number,
  classId: number,
  slotId: number,
  patch: { dayOfWeek?: any; period?: number; subjectId?: number; teacherId?: number },
) {
  const existing = await scheduleSlotModel.findByIdAndSchool(slotId, schoolId);
  if (!existing) throw new HttpError(404, 'Schedule slot not found');
  if (existing.class_id !== classId) throw new HttpError(404, 'Schedule slot not found');

  const nextTeacherId = patch.teacherId ?? existing.teacher_id;
  const nextSubjectId = patch.subjectId ?? existing.subject_id;
  const nextDayOfWeek = patch.dayOfWeek ?? existing.day_of_week;
  const nextPeriod = patch.period ?? existing.period;

  await assertTeacherCanTeachSlot(schoolId, classId, nextTeacherId, nextSubjectId);

  const classConflict = await scheduleSlotModel.existsClassSlot({
    schoolId,
    classId,
    dayOfWeek: nextDayOfWeek,
    period: nextPeriod,
  });
  if (classConflict) {
    // If the conflicting slot is the same record we are updating, ignore.
    if (!(existing.day_of_week === nextDayOfWeek && existing.period === nextPeriod)) {
      throw new HttpError(409, 'This class already has a slot at the same day/period');
    }
  }

  const teacherConflict = await scheduleSlotModel.existsTeacherSlot({
    schoolId,
    teacherId: nextTeacherId,
    dayOfWeek: nextDayOfWeek,
    period: nextPeriod,
  });
  if (teacherConflict) {
    if (
      !(
        existing.teacher_id === nextTeacherId &&
        existing.day_of_week === nextDayOfWeek &&
        existing.period === nextPeriod
      )
    ) {
      throw new HttpError(409, 'This teacher already has a slot at the same day/period');
    }
  }

  try {
    const updated = await scheduleSlotModel.update(slotId, schoolId, {
      dayOfWeek: patch.dayOfWeek,
      period: patch.period,
      subjectId: patch.subjectId,
      teacherId: patch.teacherId,
    });
    if (!updated) throw new HttpError(404, 'Schedule slot not found');
    return updated;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'Schedule conflict');
    throw e;
  }
}

export async function deleteSlot(schoolId: number, slotId: number) {
  const ok = await scheduleSlotModel.remove(slotId, schoolId);
  if (!ok) throw new HttpError(404, 'Schedule slot not found');
}
