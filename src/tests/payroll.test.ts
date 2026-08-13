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

describe('Finance — Payroll', () => {
  let adminToken = '';
  const createdAdminEmails: string[] = [];
  let schoolAdminToken = '';
  let staffId: number | null = null;
  const stamp = Date.now();
  const adminEmail = `sa.payroll.${stamp}@example.com`;

  beforeAll(async () => {
    if (!isDbReady()) return;
    const admin = await ensureSuperAdmin();
    adminToken = admin.token;
  });

  it('skips suite when database is unavailable', ({ skip }) => {
    if (!isDbReady()) skip();
    expect(isDbReady()).toBe(true);
  });

  it('sets up school admin + staff', async ({ skip }) => {
    if (!isDbReady()) skip();

    createdAdminEmails.push(adminEmail);
    const created = await request(app)
      .post('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('school[name]', `Payroll School ${stamp}`)
      .field('admin[email]', adminEmail)
      .field('admin[password]', 'SchoolAdmin123!')
      .field('admin[name]', 'Payroll Admin')
      .attach('logo', tinyPngPath());
    expect(created.status).toBe(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: adminEmail, password: 'SchoolAdmin123!' });
    expect(login.status).toBe(200);
    schoolAdminToken = login.body.token;

    const staff = await request(app)
      .post('/api/school-admin/staff')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        name: 'Payroll Staff',
        email: `staff.payroll.${stamp}@example.com`,
        phone: `011${String(stamp).slice(-8)}`,
        password: 'StaffPass123!',
      });
    expect(staff.status).toBe(201);
    staffId = staff.body.id;
  });

  it('POST /api/school/staff/:staffId/salary — set basic salary', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !staffId) skip();

    const res = await request(app)
      .post(`/api/school/staff/${staffId}/salary`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ basicSalary: 4500 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ staffId, basicSalary: 4500 });
  });

  it('POST /api/school/staff/:staffId/salary-payments — cash voucher', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !staffId) skip();

    const res = await request(app)
      .post(`/api/school/staff/${staffId}/salary-payments`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ amount: 4500, paidAt: '2026-08-01', note: 'August cash' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      amount: 4500,
      paidAt: '2026-08-01',
      note: 'August cash',
    });
  });

  it('GET /api/school/staff/:staffId/salary-payments — history', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !staffId) skip();

    const res = await request(app)
      .get(`/api/school/staff/${staffId}/salary-payments`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      amount: 4500,
      paidAt: '2026-08-01',
    });
  });

  it('POST /api/school/staff/:staffId/salary-adjustments — bonus', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !staffId) skip();

    const res = await request(app)
      .post(`/api/school/staff/${staffId}/salary-adjustments`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ type: 'bonus', amount: 200, note: 'Eid' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      staffId,
      type: 'bonus',
      amount: 200,
      note: 'Eid',
    });
  });

  it('404 for unknown staff', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken) skip();

    const res = await request(app)
      .post('/api/school/staff/99999999/salary')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ basicSalary: 1 });
    expect(res.status).toBe(404);
  });

  it('cleans up created schools', async ({ skip }) => {
    if (!isDbReady()) skip();
    for (const email of createdAdminEmails) {
      await cleanupSchoolByAdminEmail(email);
    }
  });
});
