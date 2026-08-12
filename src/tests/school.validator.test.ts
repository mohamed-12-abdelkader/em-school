import { describe, expect, it } from 'vitest';
import {
  createSchoolSchema,
  normalizeCreateSchoolBody,
  updateSchoolStatusSchema,
} from '../validators/school.validator';

describe('school.validator (unit)', () => {
  it('normalizes nested JSON body', () => {
    const normalized = normalizeCreateSchoolBody({
      school: { name: 'Alpha', description: 'D', logo: 'https://cdn.example.com/a.png' },
      admin: { email: 'a@example.com', password: 'password12', name: 'Admin' },
    });

    const parsed = createSchoolSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.school.name).toBe('Alpha');
      expect(parsed.data.admin.email).toBe('a@example.com');
      expect(parsed.data.admin.name).toBe('Admin');
    }
  });

  it('normalizes multipart bracket fields and flat legacy fields', () => {
    const fromBrackets = normalizeCreateSchoolBody({
      'school[name]': 'Beta',
      'admin[email]': 'b@example.com',
      'admin[password]': 'password12',
    });
    expect(createSchoolSchema.safeParse(fromBrackets).success).toBe(true);

    const fromFlat = normalizeCreateSchoolBody({
      name: 'Gamma',
      email: 'c@example.com',
      password: 'password12',
    });
    expect(createSchoolSchema.safeParse(fromFlat).success).toBe(true);
  });

  it('parses status body as active|suspended|deleted', () => {
    expect(updateSchoolStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
    expect(updateSchoolStatusSchema.safeParse({ status: 'suspended' }).success).toBe(true);
    expect(updateSchoolStatusSchema.safeParse({ status: 'deleted' }).success).toBe(true);
    expect(updateSchoolStatusSchema.safeParse({ action: 'activate' }).success).toBe(false);
  });
});
