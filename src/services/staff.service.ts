import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model';
import * as schoolModel from '../models/school.model';
import { toStaffResource } from '../resources/staff.resource';
import { HttpError } from '../utils';

export async function createStaff(
  schoolId: number,
  input: { name: string; email: string; phone: string; password: string },
) {
  const school = await schoolModel.findById(schoolId);
  if (!school || school.status === 'deleted') {
    throw new HttpError(404, 'School not found');
  }

  if (await userModel.emailExists(input.email)) {
    throw new HttpError(409, 'Email already in use');
  }
  if (await userModel.phoneExists(input.phone)) {
    throw new HttpError(409, 'Phone already in use');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const row = await userModel.insertStudentAffairsStaff({
      schoolId,
      email: input.email,
      phone: input.phone,
      passwordHash,
      name: input.name,
    });
    return toStaffResource(row);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Email or phone already in use');
    }
    throw e;
  }
}

export async function updateStaffStatus(
  schoolId: number,
  staffId: number,
  status: 'active' | 'inactive',
) {
  const existing = await userModel.findStaffByIdAndSchool(staffId, schoolId);
  if (!existing) throw new HttpError(404, 'Staff not found');

  const updated = await userModel.updateStaffStatus(staffId, schoolId, status);
  if (!updated) throw new HttpError(404, 'Staff not found');

  return { id: updated.id, status: updated.status as 'active' | 'inactive' };
}
