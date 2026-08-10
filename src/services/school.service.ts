import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model';
import { HttpError, uploadToCloudinary } from '../utils';

export async function listSchoolsForAdmin(options: { limit: number; skip: number; q?: string }) {
  const [schools, total] = await Promise.all([
    userModel.listSchoolAccounts(options.limit, options.skip, options.q),
    userModel.countSchoolAccounts(options.q),
  ]);
  return {
    schools,
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + schools.length < total,
    },
  };
}

export async function getSchoolForAdmin(schoolId: number) {
  const row = await userModel.findSchoolAccountById(schoolId);
  if (!row) throw new HttpError(404, 'School not found');
  return row;
}

export async function createSchoolAccount(input: {
  name: string;
  description: string | null;
  email: string;
  password: string;
  logoFilePath: string;
}) {
  if (await userModel.emailExists(input.email)) {
    throw new HttpError(409, 'Email already in use');
  }

  const logoUrl = await uploadToCloudinary(input.logoFilePath);
  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const row = await userModel.insertSchoolUser({
      name: input.name,
      description: input.description,
      logoUrl,
      email: input.email,
      passwordHash,
    });

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      description: row.description,
      logo: row.logo,
      role: row.role,
      created_at: row.created_at,
    };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Email already in use');
    }
    throw e;
  }
}
