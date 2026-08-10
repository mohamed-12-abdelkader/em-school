import * as schoolClassModel from '../models/schoolClass.model';
import * as schoolGradeModel from '../models/schoolGrade.model';
import { HttpError } from '../utils';

export async function listClassesByGrade(
  gradeId: number,
  schoolId: number,
  limit: number,
  skip: number,
) {
  const grade = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!grade) throw new HttpError(404, 'Grade not found');

  const [rows, total] = await Promise.all([
    schoolClassModel.listByGrade(gradeId, schoolId, limit, skip),
    schoolClassModel.countByGrade(gradeId, schoolId),
  ]);

  return {
    classes: rows,
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + rows.length < total,
    },
  };
}

export async function getClass(classId: number, schoolId: number) {
  const row = await schoolClassModel.findByIdAndSchool(classId, schoolId);
  if (!row) throw new HttpError(404, 'Class not found');
  return row;
}

export async function createClassInGrade(
  gradeId: number,
  schoolId: number,
  input: { name: string; capacity?: number | null },
) {
  const grade = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!grade) throw new HttpError(404, 'Grade not found');

  try {
    return await schoolClassModel.insert({
      gradeId,
      name: input.name,
      capacity: input.capacity ?? null,
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505')
      throw new HttpError(409, 'A class with this name already exists in this grade');
    throw e;
  }
}

export async function updateClass(
  classId: number,
  schoolId: number,
  patch: { name?: string; capacity?: number | null },
) {
  const existing = await schoolClassModel.findByIdAndSchool(classId, schoolId);
  if (!existing) throw new HttpError(404, 'Class not found');

  try {
    const row = await schoolClassModel.update(classId, schoolId, patch);
    if (!row) throw new HttpError(404, 'Class not found');
    return row;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505')
      throw new HttpError(409, 'A class with this name already exists in this grade');
    throw e;
  }
}

export async function deleteClass(classId: number, schoolId: number) {
  const ok = await schoolClassModel.remove(classId, schoolId);
  if (!ok) throw new HttpError(404, 'Class not found');
}
