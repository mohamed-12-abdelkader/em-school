import type { Request } from 'express';
import { HttpError } from '../utils';

/** Resolve organization school id from an authenticated school portal user. */
export function getAuthSchoolId(req: Request): number {
  const user = req.user;
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (user.role === 'school_admin') {
    if (!user.schoolId) {
      throw new HttpError(403, 'School admin is not linked to a school');
    }
    return user.schoolId;
  }

  // Legacy role='school' (pre-migration): user id was the organization id
  if (user.role === 'school') {
    return user.schoolId ?? user.id;
  }

  throw new HttpError(403, 'School context required');
}
