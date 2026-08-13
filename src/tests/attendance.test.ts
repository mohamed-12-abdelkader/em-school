import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  app,
  cleanupSchoolByAdminEmail,
  ensureSuperAdmin,
  isDbReady,
  request,
  tinyPngPath,
} from './helpers';
import {
  attendanceBatchSchema,
  attendanceScanSchema,
  normalizeAttendanceScanBody,
} from '../validators/attendance.validator';
import { toWhatsAppAddress } from '../services/whatsapp.service';

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    uploadToCloudinary: vi.fn(async (filePath: string) => {
      return `https://cdn.example.com/student-docs/${encodeURIComponent(filePath.split(/[/\\]/).pop() || 'doc.png')}`;
    }),
  };
});

describe('attendance validators + whatsapp helpers', () => {
  it('accepts qr_code and legacy raw', () => {
    expect(attendanceScanSchema.safeParse({ qr_code: '{"v":1}' }).success).toBe(true);
    expect(
      attendanceScanSchema.safeParse(normalizeAttendanceScanBody({ raw: '{"v":1}' })).success,
    ).toBe(true);
  });

  it('accepts batch body', () => {
    const parsed = attendanceBatchSchema.safeParse({
      classroom_id: '4',
      date: '2026-08-13',
      records: [{ studentId: '9', status: 'absent' }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.classroom_id).toBe(4);
      expect(parsed.data.records[0]?.studentId).toBe(9);
    }
  });

  it('normalizes Egyptian WhatsApp numbers', () => {
    expect(toWhatsAppAddress('01012345678')).toBe('201012345678');
    expect(toWhatsAppAddress('+20 101 234 5678')).toBe('201012345678');
  });
});

describe('School attendance scan / list / batch / reports / parent', () => {
  let adminToken = '';
  const createdAdminEmails: string[] = [];
  let schoolAdminToken = '';
  let parentToken = '';
  let classroomId: number | null = null;
  let studentId: number | null = null;
  let qrPayload = '';
  const stamp = Date.now();
  const adminEmail = `sa.att.${stamp}@example.com`;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  beforeAll(async () => {
    if (!isDbReady()) return;
    const admin = await ensureSuperAdmin();
    adminToken = admin.token;
  });

  it('skips suite when database is unavailable', ({ skip }) => {
    if (!isDbReady()) skip();
    expect(isDbReady()).toBe(true);
  });

  it('sets up school + student', async ({ skip }) => {
    if (!isDbReady()) skip();

    createdAdminEmails.push(adminEmail);
    const created = await request(app)
      .post('/api/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('school[name]', `Att School ${stamp}`)
      .field('admin[email]', adminEmail)
      .field('admin[password]', 'SchoolAdmin123!')
      .field('admin[name]', 'Att Admin')
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
        name: `2099-${stamp}`,
        startDate: '2099-09-01',
        endDate: '2100-06-30',
        isCurrent: true,
      });
    expect(year.status).toBe(201);

    const grade = await request(app)
      .post('/api/school/grades')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ name: 'G1', stage: 'primary' });
    expect(grade.status).toBe(201);
    const gradeId = grade.body.grade.id;

    const classroom = await request(app)
      .post(`/api/school/grades/${gradeId}/classes`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ name: 'A' });
    expect(classroom.status).toBe(201);
    classroomId = classroom.body.class.id;

    const student = await request(app)
      .post('/api/school/students')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        firstName: 'Omar',
        lastName: 'Att',
        gender: 'male',
        birthDate: '2015-03-01',
        gradeId,
        classroomId,
        parentName: 'Parent Att',
        parentPhone: `011${String(stamp).slice(-8)}`,
        parentWhatsappNumber: '01033334444',
        parentEmail: `parent.att.${stamp}@example.com`,
      });
    expect(student.status).toBe(201);
    studentId = student.body.student.id;
    qrPayload = student.body.qr.payload;

    const parentAuth = await request(app)
      .post('/api/auth/login')
      .send({
        login: student.body.loginCodes.parent.code,
        password: student.body.loginCodes.parent.password,
      });
    expect(parentAuth.status).toBe(200);
    parentToken = parentAuth.body.token;
  });

  it('POST /school/attendance/scan — 200 spec shape', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !qrPayload || !studentId) skip();

    const res = await request(app)
      .post('/api/school/attendance/scan')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ qr_code: qrPayload });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      studentId,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      status: 'present',
    });
  });

  it('POST /school/attendance/scan — 409 already marked', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !qrPayload) skip();

    const res = await request(app)
      .post('/api/school/attendance/scan')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ qr_code: qrPayload });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Already marked today');
  });

  it('GET /school/attendance — data + filters', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !studentId || !classroomId) skip();

    const res = await request(app)
      .get('/api/school/attendance')
      .query({ class_id: classroomId, date: today, student_id: studentId })
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      studentId,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      status: 'present',
    });
  });

  it('POST /school/attendance/batch — mark absent', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !studentId || !classroomId) skip();

    const res = await request(app)
      .post('/api/school/attendance/batch')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        classroom_id: classroomId,
        date: '2026-08-12',
        records: [{ studentId, status: 'absent' }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ marked: 1 });
  });

  it('GET /school/attendance/reports', async ({ skip }) => {
    if (!isDbReady() || !schoolAdminToken || !studentId || !classroomId) skip();

    const res = await request(app)
      .get('/api/school/attendance/reports')
      .query({ classroom_id: classroomId, from: '2020-01-01', to: '2099-12-31' })
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId,
          presentPercent: expect.any(Number),
        }),
      ]),
    );
  });

  it('GET /parent/attendance — children + records', async ({ skip }) => {
    if (!isDbReady() || !parentToken || !studentId) skip();

    const res = await request(app)
      .get('/api/parent/attendance')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId,
          records: expect.arrayContaining([
            expect.objectContaining({
              date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
              status: expect.stringMatching(/^(present|absent)$/),
            }),
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
