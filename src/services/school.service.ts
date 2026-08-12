import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import pool from '../db/pool';
import * as schoolModel from '../models/school.model';
import * as userModel from '../models/user.model';
import * as registrationCodeModel from '../models/registrationCode.model';
import {
  toRegistrationCodeResource,
  toSchoolAdminResource,
  toSchoolListItem,
  toSchoolResource,
} from '../resources/school.resource';
import { HttpError, uploadToCloudinary } from '../utils';
import type { SchoolStatus } from '../models/school.model';

async function generateUniqueRegistrationCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = `REG-${randomBytes(4).toString('hex').toUpperCase()}`;
    if (!(await registrationCodeModel.codeExists(code))) return code;
  }
  throw new HttpError(500, 'Failed to generate registration code');
}

export async function listSchoolsForAdmin(options: { limit: number; skip: number; q?: string }) {
  const [schools, total] = await Promise.all([
    schoolModel.listSchools(options.limit, options.skip, options.q),
    schoolModel.countSchools(options.q),
  ]);
  return {
    data: schools.map((s) => toSchoolListItem(s)),
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + schools.length < total,
    },
  };
}

export async function getSchoolForAdmin(schoolId: number) {
  const row = await schoolModel.findById(schoolId);
  if (!row) throw new HttpError(404, 'School not found');

  const [registrationCode, admin] = await Promise.all([
    registrationCodeModel.findActiveBySchoolId(schoolId),
    userModel.findSchoolAdminBySchoolId(schoolId),
  ]);

  return {
    school: toSchoolResource(row, registrationCode ?? null),
    admin: admin ? toSchoolAdminResource(admin) : null,
  };
}

export async function getSchoolAdminForAdmin(schoolId: number) {
  const school = await schoolModel.findById(schoolId);
  if (!school) throw new HttpError(404, 'School not found');

  const admin = await userModel.findSchoolAdminBySchoolId(schoolId);
  if (!admin) throw new HttpError(404, 'School admin not found');
  return toSchoolAdminResource(admin);
}

export async function createSchoolAccount(input: {
  school: {
    name: string;
    description: string | null;
    logoUrl?: string | null;
    address: string | null;
    contactPhone: string | null;
  };
  admin: {
    email: string;
    password: string;
    name?: string;
  };
  logoFilePath?: string;
}) {
  if (await userModel.emailExists(input.admin.email)) {
    throw new HttpError(409, 'Email already in use');
  }

  let logoUrl = input.school.logoUrl ?? null;
  if (input.logoFilePath) {
    logoUrl = await uploadToCloudinary(input.logoFilePath);
  }
  if (!logoUrl) {
    throw new HttpError(
      400,
      'Logo is required (upload file field "logo" or provide school.logo URL)',
    );
  }

  const passwordHash = await bcrypt.hash(input.admin.password, 10);
  const code = await generateUniqueRegistrationCode();
  const adminName = input.admin.name?.trim() || input.school.name;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const school = await schoolModel.insertSchool(
      {
        name: input.school.name,
        description: input.school.description,
        logoUrl,
        address: input.school.address,
        contactPhone: input.school.contactPhone,
      },
      client,
    );

    const admin = await userModel.insertSchoolAdmin(
      {
        schoolId: school.id,
        email: input.admin.email,
        passwordHash,
        name: adminName,
      },
      client,
    );

    const registrationCode = await registrationCodeModel.insertActiveCode(school.id, code, client);

    await client.query('COMMIT');

    return {
      school: toSchoolResource(school, registrationCode),
      admin: toSchoolAdminResource(admin),
    };
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
    address?: string | null;
    contactPhone?: string | null;
    logoUrl?: string;
    logoFilePath?: string;
  },
) {
  const existing = await schoolModel.findById(schoolId);
  if (!existing) throw new HttpError(404, 'School not found');

  let logoUrl = input.logoUrl;
  if (input.logoFilePath) {
    logoUrl = await uploadToCloudinary(input.logoFilePath);
  }

  const updated = await schoolModel.updateSchool(schoolId, {
    name: input.name,
    description: input.description,
    address: input.address,
    contactPhone: input.contactPhone,
    logoUrl,
  });
  if (!updated) throw new HttpError(404, 'School not found');

  const registrationCode = await registrationCodeModel.findActiveBySchoolId(schoolId);
  return toSchoolResource(updated, registrationCode ?? null);
}

export async function updateSchoolStatusForAdmin(schoolId: number, status: SchoolStatus) {
  const existing = await schoolModel.findById(schoolId);
  if (!existing) throw new HttpError(404, 'School not found');

  const updated = await schoolModel.updateStatus(schoolId, status);
  if (!updated) throw new HttpError(404, 'School not found');

  if (status === 'deleted') {
    await registrationCodeModel.revokeActiveForSchool(schoolId);
  }

  return { id: updated.id, status: updated.status };
}

/** Issue a code if missing; return existing active code otherwise. */
export async function ensureRegistrationCode(schoolId: number) {
  const school = await schoolModel.findById(schoolId);
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
  const school = await schoolModel.findById(schoolId);
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
    schoolModel.countSchools(),
    schoolModel.countUsersPerSchool(),
    schoolModel.countByStatus(),
  ]);
  return { schoolsCount, usersPerSchool, statusBreakdown };
}
