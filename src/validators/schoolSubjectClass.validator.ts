import { z } from 'zod/v4';

const subjectIdsSchema = z.array(z.number().int().positive()).nonempty('subjectIds is required');

export const addSubjectsToClassSchema = z.object({
  subjectIds: subjectIdsSchema,
});

export const replaceSubjectsForClassSchema = z.object({
  subjectIds: subjectIdsSchema,
});
