import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool', () => {
  const client = {
    query: vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  return {
    default: {
      connect: vi.fn(async () => client),
      query: vi.fn(),
    },
  };
});

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    uploadToCloudinary: vi.fn(async () => 'https://cdn.example.com/logo.png'),
  };
});

vi.mock('../models/school.model', () => ({
  listSchools: vi.fn(),
  countSchools: vi.fn(),
  findById: vi.fn(),
  insertSchool: vi.fn(),
  updateSchool: vi.fn(),
  updateStatus: vi.fn(),
  countUsersPerSchool: vi.fn(),
  countByStatus: vi.fn(),
}));

vi.mock('../models/user.model', () => ({
  emailExists: vi.fn(),
  insertSchoolAdmin: vi.fn(),
  findSchoolAdminBySchoolId: vi.fn(),
}));

vi.mock('../models/registrationCode.model', () => ({
  codeExists: vi.fn(async () => false),
  insertActiveCode: vi.fn(),
  findActiveBySchoolId: vi.fn(),
  revokeActiveForSchool: vi.fn(),
}));

import * as schoolModel from '../models/school.model';
import * as userModel from '../models/user.model';
import * as registrationCodeModel from '../models/registrationCode.model';
import * as schoolService from '../services/school.service';

describe('school.service (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSchoolAccount returns nested school + admin', async () => {
    vi.mocked(userModel.emailExists).mockResolvedValue(false);
    vi.mocked(schoolModel.insertSchool).mockResolvedValue({
      id: 10,
      name: 'Org School',
      description: 'Desc',
      logo: 'https://cdn.example.com/logo.png',
      address: null,
      contact_phone: null,
      status: 'active',
      created_at: new Date('2026-01-01'),
    });
    vi.mocked(userModel.insertSchoolAdmin).mockResolvedValue({
      id: 99,
      email: 'admin@school.test',
      name: 'Org School',
      role: 'school_admin',
      school_id: 10,
      status: 'active',
      created_at: new Date('2026-01-01'),
    });
    vi.mocked(registrationCodeModel.insertActiveCode).mockResolvedValue({
      id: 1,
      school_id: 10,
      code: 'REG-ABCDEF12',
      status: 'active',
      created_at: new Date('2026-01-01'),
      revoked_at: null,
    });

    const result = await schoolService.createSchoolAccount({
      school: {
        name: 'Org School',
        description: 'Desc',
        logoUrl: null,
        address: null,
        contactPhone: null,
      },
      admin: {
        email: 'admin@school.test',
        password: 'password12',
      },
      logoFilePath: '/tmp/logo.png',
    });

    expect(result.school.id).toBe(10);
    expect(result.school.status).toBe('active');
    expect(result.admin).toMatchObject({
      id: 99,
      email: 'admin@school.test',
      role: 'school_admin',
      schoolId: 10,
    });
    expect(
      'registrationCode' in result.school ? result.school.registrationCode?.code : undefined,
    ).toBe('REG-ABCDEF12');
  });

  it('listSchoolsForAdmin returns data[] without admin credentials', async () => {
    vi.mocked(schoolModel.listSchools).mockResolvedValue([
      {
        id: 1,
        name: 'A',
        description: null,
        logo: null,
        address: null,
        contact_phone: null,
        status: 'active',
        created_at: new Date(),
      },
    ]);
    vi.mocked(schoolModel.countSchools).mockResolvedValue(1);

    const result = await schoolService.listSchoolsForAdmin({ limit: 20, skip: 0 });
    expect(result.data).toEqual([{ id: 1, name: 'A', logo: null, status: 'active' }]);
    expect(result.pagination.total).toBe(1);
  });

  it('updateSchoolStatusForAdmin returns { id, status }', async () => {
    vi.mocked(schoolModel.findById).mockResolvedValue({
      id: 5,
      name: 'A',
      description: null,
      logo: null,
      address: null,
      contact_phone: null,
      status: 'active',
      created_at: new Date(),
    });
    vi.mocked(schoolModel.updateStatus).mockResolvedValue({
      id: 5,
      name: 'A',
      description: null,
      logo: null,
      address: null,
      contact_phone: null,
      status: 'suspended',
      created_at: new Date(),
    });

    const result = await schoolService.updateSchoolStatusForAdmin(5, 'suspended');
    expect(result).toEqual({ id: 5, status: 'suspended' });
  });

  it('getAdminDashboard aggregates org metrics', async () => {
    vi.mocked(schoolModel.countSchools).mockResolvedValue(3);
    vi.mocked(schoolModel.countUsersPerSchool).mockResolvedValue([
      { schoolId: 1, schoolName: 'A', usersCount: 10 },
    ]);
    vi.mocked(schoolModel.countByStatus).mockResolvedValue({
      active: 2,
      suspended: 1,
      deleted: 0,
    });

    await expect(schoolService.getAdminDashboard()).resolves.toEqual({
      schoolsCount: 3,
      usersPerSchool: [{ schoolId: 1, schoolName: 'A', usersCount: 10 }],
      statusBreakdown: { active: 2, suspended: 1, deleted: 0 },
    });
  });
});
