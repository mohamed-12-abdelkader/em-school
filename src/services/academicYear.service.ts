import * as academicYearModel from '../models/academicYear.model';
import { HttpError } from '../utils';

export async function listAcademicYears(schoolId: number, limit: number, skip: number) {
  const [rows, total] = await Promise.all([
    academicYearModel.listBySchool(schoolId, limit, skip),
    academicYearModel.countBySchool(schoolId),
  ]);
  return {
    academicYears: rows,
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + rows.length < total,
    },
  };
}

export async function getAcademicYear(yearId: number, schoolId: number) {
  const row = await academicYearModel.findByIdAndSchool(yearId, schoolId);
  if (!row) throw new HttpError(404, 'Academic year not found');
  return row;
}

export async function createAcademicYear(
  schoolId: number,
  input: {
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  },
) {
  if (input.endDate < input.startDate) {
    throw new HttpError(400, 'endDate must be on or after startDate');
  }

  const makeCurrent = Boolean(input.isCurrent);
  try {
    if (makeCurrent) {
      await academicYearModel.clearCurrent(schoolId);
    }
    return await academicYearModel.insert({
      schoolId,
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: makeCurrent,
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Academic year name already exists for this school');
    }
    throw e;
  }
}

export async function updateAcademicYear(
  yearId: number,
  schoolId: number,
  patch: {
    name?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  },
) {
  const existing = await academicYearModel.findByIdAndSchool(yearId, schoolId);
  if (!existing) throw new HttpError(404, 'Academic year not found');

  const start = patch.startDate ?? existing.start_date;
  const end = patch.endDate ?? existing.end_date;
  if (end < start) {
    throw new HttpError(400, 'endDate must be on or after startDate');
  }

  try {
    if (patch.isCurrent === true) {
      await academicYearModel.clearCurrent(schoolId);
    }
    const row = await academicYearModel.update(yearId, schoolId, {
      name: patch.name?.trim(),
      startDate: patch.startDate,
      endDate: patch.endDate,
      isCurrent: patch.isCurrent,
    });
    if (!row) throw new HttpError(404, 'Academic year not found');
    return row;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Academic year name already exists for this school');
    }
    throw e;
  }
}

export async function deleteAcademicYear(yearId: number, schoolId: number) {
  const existing = await academicYearModel.findByIdAndSchool(yearId, schoolId);
  if (!existing) throw new HttpError(404, 'Academic year not found');

  const linked = await academicYearModel.countStudents(yearId, schoolId);
  if (linked > 0) {
    throw new HttpError(409, 'Cannot delete academic year that has enrolled students');
  }

  const ok = await academicYearModel.remove(yearId, schoolId);
  if (!ok) throw new HttpError(404, 'Academic year not found');
}
