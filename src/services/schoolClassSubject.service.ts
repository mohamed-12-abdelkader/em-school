import * as schoolClassSubjectModel from '../models/schoolClassSubject.model';
import * as subjectModel from '../models/subject.model';
import { HttpError } from '../utils';

export async function listClassSubjects(options: {
  schoolId: number;
  classId: number;
  limit: number;
  skip: number;
  q?: string;
}) {
  // q not implemented for now (can be added via JOIN + WHERE)
  if (options.q) {
    throw new HttpError(400, 'Filtering by subject name is not implemented');
  }
  return schoolClassSubjectModel.listSubjectsByClass(
    options.classId,
    options.schoolId,
    options.limit,
    options.skip,
  );
}

export async function addSubjectsToClass(options: {
  schoolId: number;
  classId: number;
  subjectIds: number[];
}) {
  const { schoolId, classId, subjectIds } = options;
  if (!subjectIds.length) return;

  const classSchoolId = await schoolClassSubjectModel.getClassSchoolId(classId);
  if (!classSchoolId || classSchoolId !== schoolId) {
    throw new HttpError(404, 'Class not found');
  }

  const existingIds = await subjectModel.findExistingIds(subjectIds);
  const missing = subjectIds.filter((id) => !existingIds.includes(id));
  if (missing.length) throw new HttpError(404, 'One or more subjects not found');

  // Business rule: no extra rule here; teacher assignment/schedule will validate subject existence.
  await schoolClassSubjectModel.addSubjectsToClass(classId, subjectIds);
}

export async function replaceClassSubjects(options: {
  schoolId: number;
  classId: number;
  subjectIds: number[];
}) {
  const { schoolId, classId, subjectIds } = options;

  const classSchoolId = await schoolClassSubjectModel.getClassSchoolId(classId);
  if (!classSchoolId || classSchoolId !== schoolId) {
    throw new HttpError(404, 'Class not found');
  }

  // Validate subjects exist
  const existingIds = await subjectModel.findExistingIds(subjectIds);
  const missing = subjectIds.filter((id) => !existingIds.includes(id));
  if (missing.length) throw new HttpError(404, 'One or more subjects not found');

  await schoolClassSubjectModel.replaceSubjectsForClass(classId, schoolId, subjectIds);
}
