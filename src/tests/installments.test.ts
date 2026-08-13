import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  app,
  cleanupSchoolByAdminEmail,
  ensureSuperAdmin,
  isDbReady,
  request,
  tinyPngPath,
} from './helpers';
import { payInstallmentSchema } from '../validators/installment.validator';
import { toPublicInstallmentStatus } from '../utils/installmentStatus';

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    uploadToCloudinary: vi.fn(async (filePath: string) => {
      return `https://cdn.example.com/student-docs/${encodeURIComponent(filePath.split(/[/\\]/).pop() || 'doc.png')}`;
    }),
  };
});

describe('installment status machine', () => {
  it('maps paid/unpaid + due date to upcoming|due|overdue|paid', () => {
    expect(toPublicInstallmentStatus('paid', '2020-01-01', '2026-08-13')).toBe('paid');
    expect(toPublicInstallmentStatus('unpaid', '2026-08-14', '2026-08-13')).toBe('upcoming');
    expect(toPublicInstallmentStatus('unpaid', '2026-08-13', '2026-08-13')).toBe('due');
    expect(toPublicInstallmentStatus('unpaid', '2026-08-12', '2026-08-13')).toBe('overdue');
  });
});

describe('pay installment body', () => {
  it('accepts empty body (full remaining pay)', () => {
    expect(payInstallmentSchema.safeParse({}).success).toBe(true);
    expect(payInstallmentSchema.safeParse(undefined).success).toBe(true);
  });

  it('accepts optional positive amount (partial allowed)', () => {
    const parsed = payInstallmentSchema.safeParse({ amount: 250 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(250);
  });

  it('rejects zero or negative amount', () => {
    expect(payInstallmentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(payInstallmentSchema.safeParse({ amount: -1 }).success).toBe(false);
  });
});

describe('Finance — Installments, overdue, parent fees, receipts', () => {
  let adminToken = '';
  const createdAdminEmails: string[] = [];
  let schoolAdminToken = '';
  let parentToken = '';
  let gradeId: number | null = null;
  let classroomId: number | null = null;
  let studentId: number | null = null;
  let overdueInstallmentId: number | null = null;
  let upcomingInstallmentId: number | null = null;
  const stamp = Date.now();
  const adminEmail = `sa.fees.${stamp}@example.com`;

  beforeAll(async () => {
    if (!isDbReady()) return;
    const admin = await ensureSuperAdmin();
    adminToken = admin.token;
  });

  it('skips suite when database is unavailable', ({ skip }) => {
    if (!isDbReady()) skip();
    expect(isDbReady()).toBe(true);
  });

  it('sets up school, plan, student with mixed due dates', async ({ skip }) => {
    if (!isDbReady()) skip();

    createdAdminEmails.push(adminEmail);
    const created = await request(app)
      .post('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('school[name]', `Fees School ${stamp}`)
      .field('admin[email]', adminEmail)
      .field('admin[password]', 'SchoolAdmin123!')
      .field('admin[name]', 'Fees Admin')
      .attach('logo', tinyPngPath());
    expect(created.status).toBe(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: adminEmail, password: 'SchoolAdmin123!' });
    expect(login.status).toBe(200);
    schoolAdminToken = login.body.token;

    const year = await request(app)
      .post('/api/school/academic-years')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        name: `2026-${stamp}`,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        isCurrent: true,
      });
    expect(year.status).toBe(201);

    const grade = await request(app)
      .post('/api/school/grades')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ name: 'G1', stage: 'primary' });
    expect(grade.status).toBe(201);
    gradeId = grade.body.grade.id;

    const classroom = await request(app)
      .post(`/api/school/grades/${gradeId}/classes`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ name: 'A' });
    expect(classroom.status).toBe(201);
    classroomId = classroom.body.class.id;

    const plan = await request(app)
      .put(`/api/school/grades/${gradeId}/fee-plan`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        totalAmount: 3000,
        installments: [
          { dueDate: '2020-01-01', amount: 1000 },
          { dueDate: '2020-02-01', amount: 1000 },
          { dueDate: '2099-01-01', amount: 1000 },
        ],
      });
    expect(plan.status).toBe(200);

    const student = await request(app)
      .post('/api/school/students')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        firstName: 'Ali',
        lastName: 'Fees',
        gender: 'male',
        birthDate: '2015-01-15',
        gradeId,
        classroomId,
        parentName: 'Parent Fees',
        parentPhone: `010${String(stamp).slice(-8)}`,
        parentEmail: `parent.fees.${stamp}@example.com`,
        password: 'StudentPass123!',
      });
    expect(student.status).toBe(201);
    studentId = student.body.student.id;

    const parentLogin = student.body.loginCodes?.parent;
    expect(parentLogin?.code).toEqual(expect.any(String));
    expect(parentLogin?.password).toEqual(expect.any(String));

    // Use generated parent password from create
    const parentAuth = await request(app)
      .post('/api/auth/login')
      .send({ login: parentLogin.code, password: parentLogin.password });
    expect(parentAuth.status).toBe(200);
    parentToken = parentAuth.body.token;
  });

  it('GET student fees exposes upcoming|due|overdue|paid', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !studentId) skip();

    const res = await request(app)
      .get(`/api/school/students/${studentId}/fees`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.installments).toHaveLength(3);
    expect(res.body.installments.map((i: { status: string }) => i.status)).toEqual([
      'overdue',
      'overdue',
      'upcoming',
    ]);
    overdueInstallmentId = res.body.installments[0].id;
    upcomingInstallmentId = res.body.installments[2].id;
  });

  it('GET /school/installments/overdue', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !gradeId || !classroomId) skip();

    const res = await request(app)
      .get('/api/school/installments/overdue')
      .query({ grade_id: gradeId, classroom_id: classroomId })
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toMatchObject({
      studentId,
      studentName: expect.any(String),
      installmentId: expect.any(Number),
      amount: 1000,
      dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('POST pay partial amount creates immutable voucher and keeps unpaid status', async ({
    skip,
  }) => {
    if (!isDbReady() || !schoolAdminToken || !overdueInstallmentId) skip();

    const res = await request(app)
      .post(`/api/school/installments/${overdueInstallmentId}/pay`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ amount: 400 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: overdueInstallmentId,
      installmentId: overdueInstallmentId,
      amount: 1000,
      paidAmount: 400,
      remainingAmount: 600,
      status: 'overdue',
      voucherId: expect.any(Number),
      receivedBy: expect.any(Number),
      voucher: {
        voucherId: expect.any(Number),
        amount: 400,
        paidAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        receivedBy: expect.any(Number),
        installmentId: overdueInstallmentId,
      },
    });
  });

  it('POST pay remaining (omit amount) marks paid + second voucher', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !overdueInstallmentId) skip();

    const res = await request(app)
      .post(`/api/school/installments/${overdueInstallmentId}/pay`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: overdueInstallmentId,
      status: 'paid',
      paidAmount: 1000,
      remainingAmount: 0,
      voucher: { amount: 600, installmentId: overdueInstallmentId },
    });
  });

  it('rejects overpayment and already-paid', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !overdueInstallmentId || !upcomingInstallmentId) {
      skip();
    }

    const over = await request(app)
      .post(`/api/school/installments/${upcomingInstallmentId}/pay`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ amount: 99999 });
    expect(over.status).toBe(400);

    const again = await request(app)
      .post(`/api/school/installments/${overdueInstallmentId}/pay`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({});
    expect(again.status).toBe(404);
  });

  it('GET /parent/fees', async ({ skip }) => {
    if (!isDbReady() || !parentToken || !studentId) skip();

    const res = await request(app)
      .get('/api/parent/fees')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId,
          installments: expect.arrayContaining([
            expect.objectContaining({ amount: 1000, dueDate: '2020-01-01', status: 'paid' }),
            expect.objectContaining({ amount: 1000, dueDate: '2099-01-01', status: 'upcoming' }),
          ]),
        }),
      ]),
    );
  });

  it('cleans up created schools', async ({ skip }) => {
    if (!isDbReady()) skip();
    for (const email of createdAdminEmails) {
      await cleanupSchoolByAdminEmail(email);
    }
  });
});
