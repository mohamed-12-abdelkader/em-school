import * as schoolGradeModel from '../models/schoolGrade.model';
import { HttpError } from '../utils';
import type { GradeStage } from '../types/schoolAcademic';

export async function listGrades(schoolId: number, limit: number, skip: number) {
  const [rows, total] = await Promise.all([
    schoolGradeModel.listBySchool(schoolId, limit, skip),
    schoolGradeModel.countBySchool(schoolId),
  ]);

  return {
    grades: rows,
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + rows.length < total,
    },
  };
}

export async function getGrade(gradeId: number, schoolId: number) {
  const row = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!row) throw new HttpError(404, 'Grade not found');
  return row;
}

export async function createGrade(
  schoolId: number,
  input: { name: string; stage: GradeStage; description?: string },
) {
  try {
    return await schoolGradeModel.insert({
      schoolId,
      name: input.name,
      stage: input.stage,
      description: input.description ?? null,
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'A grade with this name already exists');
    throw e;
  }
}

export async function updateGrade(
  gradeId: number,
  schoolId: number,
  patch: { name?: string; stage?: GradeStage; description?: string | null },
) {
  const existing = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!existing) throw new HttpError(404, 'Grade not found');

  try {
    const row = await schoolGradeModel.update(gradeId, schoolId, patch);
    if (!row) throw new HttpError(404, 'Grade not found');
    return row;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'A grade with this name already exists');
    throw e;
  }
}

export async function deleteGrade(gradeId: number, schoolId: number) {
  const ok = await schoolGradeModel.remove(gradeId, schoolId);
  if (!ok) throw new HttpError(404, 'Grade not found');
}
