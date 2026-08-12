import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  app,
  cleanupSchoolByAdminEmail,
  ensureSuperAdmin,
  isDbReady,
  request,
  tinyPngPath,
} from './helpers';

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    uploadToCloudinary: vi.fn(async (filePath: string) => {
      // Simulate CDN upload without hitting Cloudinary
      return `https://cdn.example.com/school-logos/${encodeURIComponent(filePath.split(/[/\\]/).pop() || 'logo.png')}`;
    }),
  };
});

describe('Module 1 — Super Admin: Schools APIs', () => {
  let adminToken = '';
  const createdAdminEmails: string[] = [];
  let createdSchoolId: number | null = null;

  beforeAll(async () => {
    if (!isDbReady()) return;
    const admin = await ensureSuperAdmin();
    adminToken = admin.token;
  });

  it('skips suite when database is unavailable', ({ skip }) => {
    if (!isDbReady()) skip();
    expect(isDbReady()).toBe(true);
  });

  it('POST /api/admin/schools — creates school org + school_admin', async ({ skip }) => {
    if (!isDbReady()) skip();

    const stamp = Date.now();
    const adminEmail = `school.admin.${stamp}@example.com`;
    createdAdminEmails.push(adminEmail);

    const res = await request(app)
      .post('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('school[name]', `Test School ${stamp}`)
      .field('school[description]', 'A migrated organization school')
      .field('school[address]', 'Cairo')
      .field('school[contactPhone]', '01000000000')
      .field('admin[email]', adminEmail)
      .field('admin[password]', 'SchoolAdmin123!')
      .field('admin[name]', 'School Admin')
      .attach('logo', tinyPngPath());

    expect(res.status).toBe(201);
    expect(res.body.school).toMatchObject({
      name: `Test School ${stamp}`,
      description: 'A migrated organization school',
      status: 'active',
    });
    expect(res.body.school.id).toEqual(expect.any(Number));
    expect(res.body.school.logo).toEqual(expect.any(String));
    expect(res.body.school.email).toBeUndefined();
    expect(res.body.admin).toMatchObject({
      email: adminEmail,
      role: 'school_admin',
      schoolId: res.body.school.id,
      name: 'School Admin',
    });
    expect(res.body.admin.id).not.toBe(res.body.school.id);
    expect(res.body.school.registrationCode?.code).toMatch(/^REG-/);

    createdSchoolId = res.body.school.id;
  });

  it('GET /api/admin/schools — lists organization schools only', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .get('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      skip: expect.any(Number),
    });

    const found = res.body.data.find((s: { id: number }) => s.id === createdSchoolId);
    expect(found).toMatchObject({
      id: createdSchoolId,
      name: expect.any(String),
      status: 'active',
    });
    expect(found.email).toBeUndefined();
    expect(found.password).toBeUndefined();
  });

  it('GET /api/admin/schools/:schoolId — returns school + admin summary', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .get(`/api/admin/schools/${createdSchoolId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.school.id).toBe(createdSchoolId);
    expect(res.body.admin).toMatchObject({
      role: 'school_admin',
      schoolId: createdSchoolId,
    });
  });

  it('GET /api/admin/schools/:schoolId — 404 when missing', async ({ skip }) => {
    if (!isDbReady()) skip();

    const res = await request(app)
      .get('/api/admin/schools/99999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/admin/schools/:schoolId/admin — returns linked admin', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .get(`/api/admin/schools/${createdSchoolId}/admin`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.admin).toMatchObject({
      role: 'school_admin',
      schoolId: createdSchoolId,
    });
  });

  it('PUT /api/admin/schools/:schoolId — partial update', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .put(`/api/admin/schools/${createdSchoolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Updated School Name')
      .field('address', 'Alexandria')
      .field('contactPhone', '01111111111');

    expect(res.status).toBe(200);
    expect(res.body.school).toMatchObject({
      id: createdSchoolId,
      name: 'Updated School Name',
      address: 'Alexandria',
      contactPhone: '01111111111',
    });
    expect(res.body.school.email).toBeUndefined();
  });

  it('PATCH /api/admin/schools/:schoolId/status — suspend', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .patch(`/api/admin/schools/${createdSchoolId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: createdSchoolId, status: 'suspended' });
  });

  it('PATCH /api/admin/schools/:schoolId/status — reactivate', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const res = await request(app)
      .patch(`/api/admin/schools/${createdSchoolId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: createdSchoolId, status: 'active' });
  });

  it('GET /api/admin/dashboard — overview counts', async ({ skip }) => {
    if (!isDbReady()) skip();

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.schoolsCount).toEqual(expect.any(Number));
    expect(Array.isArray(res.body.usersPerSchool)).toBe(true);
    expect(res.body.statusBreakdown).toMatchObject({
      active: expect.any(Number),
      suspended: expect.any(Number),
      deleted: expect.any(Number),
    });
  });

  it('POST registration-code endpoints still work', async ({ skip }) => {
    if (!isDbReady() || !createdSchoolId) skip();

    const ensure = await request(app)
      .post(`/api/admin/schools/${createdSchoolId}/registration-code`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 201]).toContain(ensure.status);
    expect(ensure.body.registrationCode.code).toMatch(/^REG-/);

    const regen = await request(app)
      .post(`/api/admin/schools/${createdSchoolId}/registration-code/regenerate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(regen.status).toBe(201);
    expect(regen.body.registrationCode.code).toMatch(/^REG-/);
    expect(regen.body.registrationCode.code).not.toBe(ensure.body.registrationCode.code);
  });

  it('cleans up created schools', async ({ skip }) => {
    if (!isDbReady()) skip();
    for (const email of createdAdminEmails) {
      await cleanupSchoolByAdminEmail(email);
    }
  });
});
