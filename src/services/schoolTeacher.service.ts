import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import pool from '../db/pool';
import * as teacherModel from '../models/schoolTeacher.model';
import * as assignmentModel from '../models/teacherAssignment.model';
import * as teacherClassModel from '../models/schoolTeacherClass.model';
import * as classSubjectModel from '../models/schoolClassSubject.model';
import * as scheduleSlotModel from '../models/schoolScheduleSlot.model';
import { toTeacherResource } from '../resources/teacher.resource';
import type { TeacherStatus } from '../types/schoolSubjectsTeachers';
import { HttpError } from '../utils';

function randomPassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 14);
}

function syntheticTeacherEmail(schoolId: number, employeeCode: string): string {
  const safe = employeeCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `tch.s${schoolId}.${safe}@internal.local`;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: fullName.trim(), lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

export async function listTeachers(
  schoolId: number,
  options: { limit: number; skip: number; q?: string; status?: TeacherStatus },
) {
  const filters = { q: options.q, status: options.status };
  const [rows, total] = await Promise.all([
    teacherModel.listBySchool(schoolId, { ...options, ...filters }),
    teacherModel.countBySchool(schoolId, filters),
  ]);

  return {
    teachers: rows.map(toTeacherResource),
    rows: rows.map(toTeacherResource),
    total,
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + rows.length < total,
    },
  };
}

export async function getTeacher(teacherId: number, schoolId: number) {
  const teacher = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!teacher) throw new HttpError(404, 'Teacher not found');

  const assignments = await assignmentModel.listByTeacher(schoolId, teacherId);

  return {
    teacher: toTeacherResource(teacher),
    assignments: assignments.map((a) => ({
      id: a.id,
      academicYearId: a.academic_year_id,
      academicYearName: a.academic_year_name,
      gradeId: a.grade_id,
      gradeName: a.grade_name,
      classroomId: a.classroom_id,
      classroomName: a.classroom_name,
      subjectId: a.subject_id,
      subjectName: a.subject_name,
    })),
  };
}

export async function createTeacher(
  schoolId: number,
  input: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    gender: 'male' | 'female';
    phone: string;
    hireDate: string;
    email?: string | null;
    nationalId?: string | null;
    address?: string | null;
    photo?: string | null;
    specialization?: string | null;
    status?: TeacherStatus;
    description?: string | null;
    subjectId?: number;
    password?: string;
  },
) {
  let firstName = input.firstName?.trim();
  let lastName = input.lastName?.trim();
  const legacyName = input.fullName?.trim() || input.name?.trim();
  if (!firstName || lastName === undefined) {
    const split = splitFullName(legacyName ?? '');
    firstName = firstName || split.firstName;
    lastName = lastName ?? split.lastName;
  }
  if (!firstName) throw new HttpError(400, 'firstName أو fullName مطلوب');
  lastName = lastName ?? '';
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

  const employeeCode = await teacherModel.allocateEmployeeCode();
  const password = input.password?.trim() || randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const loginEmail = input.email?.trim() || syntheticTeacherEmail(schoolId, employeeCode);

  try {
    await pool.query('BEGIN');

    const userRes = await pool.query<{ id: number }>(
      `INSERT INTO users (email, phone, password, name, role, status, username, password_change_required)
       VALUES ($1, $2, $3, $4, 'teacher', 'active', $5, TRUE)
       RETURNING id`,
      [loginEmail, input.phone, passwordHash, fullName, employeeCode],
    );
    const userId = userRes.rows[0]?.id;
    if (!userId) throw new HttpError(500, 'فشل إنشاء حساب المدرس');

    const row = await teacherModel.create({
      schoolId,
      userId,
      employeeCode,
      firstName,
      lastName,
      fullName,
      photo: input.photo ?? null,
      gender: input.gender,
      phone: input.phone,
      email: input.email ?? null,
      nationalId: input.nationalId ?? null,
      address: input.address ?? null,
      hireDate: input.hireDate,
      specialization: input.specialization ?? null,
      status: input.status ?? 'active',
      description: input.description ?? null,
      subjectId: input.subjectId ?? null,
    });

    await pool.query('COMMIT');

    return {
      teacher: toTeacherResource(row),
      login: {
        username: employeeCode,
        password,
        hint: 'تسجيل الدخول بـ username = employeeCode؛ يُنصح بتغيير كلمة المرور عند أول دخول',
      },
    };
  } catch (e: unknown) {
    await pool.query('ROLLBACK').catch(() => undefined);
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'بريد أو رقم قومي أو كود موظف مكرر');
    }
    throw e;
  }
}

export async function updateTeacher(
  schoolId: number,
  teacherId: number,
  patch: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    gender?: 'male' | 'female';
    phone?: string;
    hireDate?: string;
    email?: string | null;
    nationalId?: string | null;
    address?: string | null;
    photo?: string | null;
    specialization?: string | null;
    status?: TeacherStatus;
    description?: string | null;
    subjectId?: number | null;
  },
) {
  const existing = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!existing) throw new HttpError(404, 'Teacher not found');

  let firstName = patch.firstName?.trim();
  let lastName = patch.lastName?.trim();
  let fullName = patch.fullName?.trim() || patch.name?.trim();

  if (fullName && (!firstName || lastName === undefined)) {
    const split = splitFullName(fullName);
    firstName = firstName ?? split.firstName;
    lastName = lastName ?? split.lastName;
  }
  if (firstName !== undefined || lastName !== undefined) {
    const fn = firstName ?? existing.first_name;
    const ln = lastName ?? existing.last_name;
    fullName = `${fn}${ln ? ` ${ln}` : ''}`.trim();
  }

  try {
    const updated = await teacherModel.update(teacherId, schoolId, {
      firstName,
      lastName,
      fullName,
      gender: patch.gender,
      phone: patch.phone,
      hireDate: patch.hireDate,
      email: patch.email === '' ? null : patch.email,
      nationalId: patch.nationalId,
      address: patch.address,
      photo: patch.photo,
      specialization: patch.specialization,
      status: patch.status,
      description: patch.description,
      subjectId: patch.subjectId,
    });
    if (!updated) throw new HttpError(404, 'Teacher not found');

    if (fullName && updated.user_id) {
      await pool.query(`UPDATE users SET name = $1 WHERE id = $2 AND role = 'teacher'`, [
        fullName,
        updated.user_id,
      ]);
    }

    return toTeacherResource(updated);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') throw new HttpError(409, 'Duplicate field');
    throw e;
  }
}

export async function deleteTeacher(schoolId: number, teacherId: number) {
  const existing = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!existing) throw new HttpError(404, 'Teacher not found');

  const userId = await teacherModel.softDelete(teacherId, schoolId);
  if (userId) {
    await pool.query(`UPDATE users SET status = 'inactive' WHERE id = $1 AND role = 'teacher'`, [
      userId,
    ]);
  }
}

// --- Legacy class assignment endpoints (compat) ---

export async function assignTeacherToClasses(
  schoolId: number,
  teacherId: number,
  classIds: number[],
) {
  const teacher = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!teacher) throw new HttpError(404, 'Teacher not found');
  if (!teacher.subject_id) {
    throw new HttpError(400, 'legacy subjectId مطلوب على المدرس لاستخدام هذا المسار؛ استخدم teacher-assignments');
  }

  for (const classId of classIds) {
    const classSchoolId = await classSubjectModel.getClassSchoolId(classId);
    if (!classSchoolId || classSchoolId !== schoolId) throw new HttpError(404, 'Class not found');

    const ok = await classSubjectModel.classHasSubject(classId, schoolId, teacher.subject_id);
    if (!ok) {
      throw new HttpError(409, 'Cannot assign teacher: class does not contain the teacher subject');
    }
  }

  await teacherClassModel.insertMany(teacherId, classIds);
}

export async function removeTeacherFromClass(schoolId: number, teacherId: number, classId: number) {
  const removed = await teacherClassModel.remove(teacherId, classId);
  if (!removed) throw new HttpError(404, 'Teacher assignment not found');
  await scheduleSlotModel.removeByTeacherAndClass({ schoolId, teacherId, classId });
}

export async function getClassesByTeacher(
  schoolId: number,
  teacherId: number,
  options: { limit: number; skip: number },
) {
  const teacher = await teacherModel.findByIdAndSchool(teacherId, schoolId);
  if (!teacher) throw new HttpError(404, 'Teacher not found');
  return teacherClassModel.listClassesByTeacher({ teacherId, schoolId, ...options });
}

export async function getTeachersByClass(
  schoolId: number,
  classId: number,
  options: { limit: number; skip: number },
) {
  const classSchoolId = await classSubjectModel.getClassSchoolId(classId);
  if (!classSchoolId || classSchoolId !== schoolId) throw new HttpError(404, 'Class not found');
  return teacherClassModel.listTeachersByClass({ classId, schoolId, ...options });
}
