import * as subjectModel from '../models/subject.model';
import { HttpError } from '../utils';

export async function listSubjects(options: { limit: number; skip: number; q?: string }) {
  return subjectModel.listAll(options);
}

export async function getSubject(subjectId: number) {
  const row = await subjectModel.findById(subjectId);
  if (!row) throw new HttpError(404, 'Subject not found');
  return row;
}

export async function createSubject(input: { name: string; description?: string | null }) {
  try {
    return await subjectModel.create(input);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'Subject name already exists');
    throw e;
  }
}

export async function updateSubject(
  subjectId: number,
  patch: { name?: string; description?: string | null },
) {
  const row = await subjectModel.findById(subjectId);
  if (!row) throw new HttpError(404, 'Subject not found');

  try {
    const updated = await subjectModel.update(subjectId, patch);
    if (!updated) throw new HttpError(404, 'Subject not found');
    return updated;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'Subject name already exists');
    throw e;
  }
}

export async function deleteSubject(subjectId: number) {
  const ok = await subjectModel.remove(subjectId);
  if (!ok) throw new HttpError(404, 'Subject not found');
}
