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
      return `https://cdn.example.com/school-logos/${encodeURIComponent(filePath.split(/[/\\]/).pop() || 'logo.png')}`;
    }),
  };
});

describe('Module 2 — School Admin: login, dashboard & settings', () => {
  let adminToken = '';
  const createdAdminEmails: string[] = [];
  let schoolId: number | null = null;
  let schoolAdminToken = '';
  let staffId: number | null = null;
  const stamp = Date.now();
  const adminEmail = `sa.mod2.${stamp}@example.com`;
  const adminPassword = 'SchoolAdmin123!';

  beforeAll(async () => {
    if (!isDbReady()) return;
    const admin = await ensureSuperAdmin();
    adminToken = admin.token;
  });

  it('skips suite when database is unavailable', ({ skip }) => {
    if (!isDbReady()) skip();
    expect(isDbReady()).toBe(true);
  });

  it('POST /api/auth/login accepts `login` and returns token + user.schoolId', async ({ skip }) => {
    if (!isDbReady()) skip();

    createdAdminEmails.push(adminEmail);

    const created = await request(app)
      .post('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('school[name]', `Mod2 School ${stamp}`)
      .field('school[address]', 'Cairo')
      .field('admin[email]', adminEmail)
      .field('admin[password]', adminPassword)
      .field('admin[name]', 'Mod2 Admin')
      .attach('logo', tinyPngPath());

    expect(created.status).toBe(201);
    schoolId = created.body.school.id;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: adminEmail, password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      id: expect.any(Number),
      role: 'school_admin',
      schoolId,
    });
    schoolAdminToken = res.body.token;
  });

  it('POST /api/login 401 returns error for bad credentials', async ({ skip }) => {
    if (!isDbReady()) skip();

    const res = await request(app)
      .post('/api/login')
      .send({ login: adminEmail, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('GET /api/school/dashboard — own school overview', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken) skip();

    const res = await request(app)
      .get('/api/school/dashboard')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      studentsCount: expect.any(Number),
      classesCount: expect.any(Number),
      teachersCount: expect.any(Number),
      pendingFees: expect.any(Number),
    });
  });

  it('PUT /api/school/settings — edits organization, not the admin user', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !schoolId) skip();

    const res = await request(app)
      .put('/api/school/settings')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ name: 'Mod2 School Renamed' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: schoolId,
      name: 'Mod2 School Renamed',
    });
    expect(res.body.email).toBeUndefined();
    expect(res.body.role).toBeUndefined();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${schoolAdminToken}`);
    expect(me.body.user.name).toBe('Mod2 Admin');
    expect(me.body.user.schoolId).toBe(schoolId);
  });

  it('GET /api/school/settings — returns own organization', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !schoolId) skip();

    const res = await request(app)
      .get('/api/school/settings')
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(schoolId);
    expect(res.body.name).toBe('Mod2 School Renamed');
  });

  it('POST /api/school-admin/staff — creates student_affairs user', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !schoolId) skip();

    const res = await request(app)
      .post('/api/school-admin/staff')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        name: 'Affairs Staff',
        email: `staff.mod2.${stamp}@example.com`,
        phone: `010${String(stamp).slice(-8)}`,
        password: 'StaffPass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Affairs Staff',
      email: `staff.mod2.${stamp}@example.com`,
      role: 'student_affairs',
      schoolId,
      status: 'active',
    });
    expect(res.body.password).toBeUndefined();
    staffId = res.body.id;
  });

  it('PATCH /api/school-admin/staff/:id/status — deactivate', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !staffId) skip();

    const res = await request(app)
      .patch(`/api/school-admin/staff/${staffId}/status`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: staffId, status: 'inactive' });
  });

  it('cleans up created schools', async ({ skip }) => {
    if (!isDbReady()) skip();
    for (const email of createdAdminEmails) {
      await cleanupSchoolByAdminEmail(email);
    }
  });
});
