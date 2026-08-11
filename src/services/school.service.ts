import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import pool from '../db/pool';
import * as userModel from '../models/user.model';
import * as registrationCodeModel from '../models/registrationCode.model';
import {
  toRegistrationCodeResource,
  toSchoolAdminResource,
} from '../resources/school.resource';
import { HttpError, uploadToCloudinary } from '../utils';

async function generateUniqueRegistrationCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = `REG-${randomBytes(4).toString('hex').toUpperCase()}`;
    if (!(await registrationCodeModel.codeExists(code))) return code;
  }
  throw new HttpError(500, 'Failed to generate registration code');
}

export async function listSchoolsForAdmin(options: { limit: number; skip: number; q?: string }) {
  const [schools, total] = await Promise.all([
    userModel.listSchoolAccounts(options.limit, options.skip, options.q),
    userModel.countSchoolAccounts(options.q),
  ]);
  return {
    schools: schools.map((s) => toSchoolAdminResource(s)),
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
  const registrationCode = await registrationCodeModel.findActiveBySchoolId(schoolId);
  return toSchoolAdminResource(row, registrationCode ?? null);
}

export async function createSchoolAccount(input: {
  name: string;
  description: string | null;
  email: string;
  password: string;
  logoFilePath: string;
  address: string | null;
  contactPhone: string | null;
}) {
  if (await userModel.emailExists(input.email)) {
    throw new HttpError(409, 'Email already in use');
  }

  const logoUrl = await uploadToCloudinary(input.logoFilePath);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const code = await generateUniqueRegistrationCode();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await userModel.insertSchoolUser(
      {
        name: input.name,
        description: input.description,
        logoUrl,
        email: input.email,
        passwordHash,
        address: input.address,
        contactPhone: input.contactPhone,
      },
      client,
    );
    const registrationCode = await registrationCodeModel.insertActiveCode(row.id, code, client);
    await client.query('COMMIT');

    const schoolRow = await userModel.findSchoolAccountById(row.id);
    return toSchoolAdminResource(schoolRow!, registrationCode);
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Email already in use');
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function updateSchoolForAdmin(
  schoolId: number,
  input: {
    name?: string;
    description?: string | null;
    email?: string;
    address?: string | null;
    contactPhone?: string | null;
    logoFilePath?: string;
  },
) {
  const existing = await userModel.findSchoolAccountById(schoolId);
  if (!existing) throw new HttpError(404, 'School not found');

  if (input.email && input.email !== existing.email) {
    if (await userModel.emailExistsExcludingUser(input.email, schoolId)) {
      throw new HttpError(409, 'Email already in use');
    }
  }

  let logoUrl: string | undefined;
  if (input.logoFilePath) {
    logoUrl = await uploadToCloudinary(input.logoFilePath);
  }

  try {
    const updated = await userModel.updateSchoolAccount(schoolId, {
      name: input.name,
      description: input.description,
      email: input.email,
      address: input.address,
      contactPhone: input.contactPhone,
      logoUrl,
    });
    if (!updated) throw new HttpError(404, 'School not found');
    const registrationCode = await registrationCodeModel.findActiveBySchoolId(schoolId);
    return toSchoolAdminResource(updated, registrationCode ?? null);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Email already in use');
    }
    throw e;
  }
}

export async function updateSchoolStatusForAdmin(
  schoolId: number,
  action: 'activate' | 'suspend' | 'soft-delete',
) {
  const existing = await userModel.findSchoolAccountById(schoolId);
  if (!existing) throw new HttpError(404, 'School not found');

  const statusMap = {
    activate: 'active',
    suspend: 'suspended',
    'soft-delete': 'deleted',
  } as const;

  const updated = await userModel.updateSchoolStatus(schoolId, statusMap[action]);
  if (!updated) throw new HttpError(404, 'School not found');

  if (action === 'soft-delete') {
    await registrationCodeModel.revokeActiveForSchool(schoolId);
  }

  const registrationCode = await registrationCodeModel.findActiveBySchoolId(schoolId);
  return toSchoolAdminResource(updated, registrationCode ?? null);
}

/** Issue a code if missing; return existing active code otherwise. */
export async function ensureRegistrationCode(schoolId: number) {
  const school = await userModel.findSchoolAccountById(schoolId);
  if (!school) throw new HttpError(404, 'School not found');
  if (school.status === 'deleted') {
    throw new HttpError(400, 'Cannot issue registration code for a deleted school');
  }

  const existing = await registrationCodeModel.findActiveBySchoolId(schoolId);
  if (existing) {
    return { created: false, registrationCode: toRegistrationCodeResource(existing) };
  }

  const code = await generateUniqueRegistrationCode();
  const row = await registrationCodeModel.insertActiveCode(schoolId, code);
  return { created: true, registrationCode: toRegistrationCodeResource(row) };
}

export async function regenerateRegistrationCode(schoolId: number) {
  const school = await userModel.findSchoolAccountById(schoolId);
  if (!school) throw new HttpError(404, 'School not found');
  if (school.status === 'deleted') {
    throw new HttpError(400, 'Cannot regenerate registration code for a deleted school');
  }

  const code = await generateUniqueRegistrationCode();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await registrationCodeModel.revokeActiveForSchool(schoolId, client);
    const row = await registrationCodeModel.insertActiveCode(schoolId, code, client);
    await client.query('COMMIT');
    return toRegistrationCodeResource(row);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getAdminDashboard() {
  const [schoolsCount, usersPerSchool, statusBreakdown] = await Promise.all([
    userModel.countSchoolAccounts(),
    userModel.countUsersPerSchool(),
    userModel.countSchoolsByStatus(),
  ]);
  return { schoolsCount, usersPerSchool, statusBreakdown };
}
