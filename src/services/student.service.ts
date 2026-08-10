import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import pool from '../db/pool';
import * as academicYearModel from '../models/academicYear.model';
import * as schoolClassModel from '../models/schoolClass.model';
import * as schoolGradeModel from '../models/schoolGrade.model';
import * as parentModel from '../models/parent.model';
import * as studentModel from '../models/student.model';
import * as studentDocumentModel from '../models/studentDocument.model';
import { toStudentResource } from '../resources/student.resource';
import type { StudentRelationship, StudentStatus } from '../types/studentAffairs';
import { parseEgyptianNationalId } from '../utils/egyptianNationalId';
import { buildStudentQrPayload } from '../utils/studentQr';
import { HttpError, logger, uploadToCloudinary } from '../utils';
import * as gradeFeePlanService from './gradeFeePlan.service';

function randomPassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 14);
}

function syntheticStudentEmail(schoolId: number, studentCode: string): string {
  const safe = studentCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `stu.s${schoolId}.${safe}@internal.local`;
}

function syntheticParentEmail(schoolId: number, phoneDigits: string): string {
  return `par.s${schoolId}.ph${phoneDigits}@internal.local`;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '') || phone;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: fullName.trim(), lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

function mapParentRelation(
  relationship: StudentRelationship,
): 'father' | 'mother' | 'other' {
  if (relationship === 'father' || relationship === 'mother') return relationship;
  return 'other';
}

function yearKeyFromAcademicYear(startDate: string, name: string): number {
  const fromStart = Number(startDate.slice(0, 4));
  if (Number.isFinite(fromStart) && fromStart >= 2000) return fromStart;
  const m = name.match(/(20\d{2})/);
  if (m) return Number(m[1]);
  return new Date().getFullYear();
}

async function getUserUsername(userId: number): Promise<string | null> {
  const r = await pool.query<{ username: string | null }>(
    'SELECT username FROM users WHERE id = $1',
    [userId],
  );
  return r.rows[0]?.username ?? null;
}

async function assertEnrollmentScope(input: {
  schoolId: number;
  academicYearId: number;
  gradeId: number;
  classroomId: number;
}) {
  const year = await academicYearModel.findByIdAndSchool(input.academicYearId, input.schoolId);
  if (!year) {
    throw new HttpError(400, 'السنة الدراسية غير موجودة داخل هذه المدرسة');
  }

  const grade = await schoolGradeModel.findByIdAndSchool(input.gradeId, input.schoolId);
  if (!grade) {
    throw new HttpError(400, 'الصف الدراسي غير موجود داخل هذه المدرسة');
  }

  const classroom = await schoolClassModel.findByIdAndSchool(input.classroomId, input.schoolId);
  if (!classroom) {
    throw new HttpError(400, 'الفصل غير موجود داخل هذه المدرسة');
  }
  if (classroom.grade_id !== input.gradeId) {
    throw new HttpError(400, 'الفصل لا يتبع الصف الدراسي المحدد');
  }

  return { year, grade, classroom };
}

export async function listStudents(
  schoolId: number,
  options: {
    limit: number;
    skip: number;
    classId?: number;
    gradeId?: number;
    academicYearId?: number;
    status?: StudentStatus;
    studentCode?: string;
    q?: string;
  },
) {
  const filters: studentModel.StudentListFilters = {};
  if (options.classId !== undefined) filters.classId = options.classId;
  if (options.gradeId !== undefined) filters.gradeId = options.gradeId;
  if (options.academicYearId !== undefined) filters.academicYearId = options.academicYearId;
  if (options.status !== undefined) filters.status = options.status;
  if (options.studentCode !== undefined && options.studentCode.trim()) {
    filters.studentCode = options.studentCode.trim();
  }
  if (options.q !== undefined && options.q.trim()) filters.q = options.q.trim();

  const [rows, total] = await Promise.all([
    studentModel.listBySchool(schoolId, options.limit, options.skip, filters),
    studentModel.countBySchool(schoolId, filters),
  ]);

  return {
    students: rows.map(toStudentResource),
    pagination: {
      total,
      limit: options.limit,
      skip: options.skip,
      hasMore: options.skip + rows.length < total,
    },
  };
}

export async function getStudent(studentId: number, schoolId: number) {
  const detail = await studentModel.findDetailByIdAndSchool(studentId, schoolId);
  if (!detail) throw new HttpError(404, 'Student not found');

  const codes = await studentModel.getLoginCodesByStudent(studentId, schoolId);
  const qrPayload =
    detail.student.qr_code?.trim() ||
    buildStudentQrPayload(schoolId, detail.student.student_code);

  return {
    student: toStudentResource(detail.student),
    academicYear: detail.relations.academicYear,
    grade: detail.relations.grade,
    classroom: detail.relations.classroom,
    parent: detail.relations.parent,
    loginCodes: {
      studentCode: codes.studentCode ?? detail.student.student_code,
      parentCode: codes.parentCode,
    },
    qr: {
      payload: qrPayload,
      studentId: detail.student.student_code,
    },
  };
}

export async function createStudent(
  schoolId: number,
  input: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    dateOfBirth?: string;
    nationalId?: string | null;
    address?: string | null;
    studentPhone?: string | null;
    phone?: string | null;
    academicYearId?: number;
    gradeId: number;
    classroomId?: number;
    classId?: number;
    parentName?: string;
    parentFullName?: string;
    parentPhone: string;
    parentEmail?: string | null;
    relationship?: StudentRelationship;
    parentRelation?: 'father' | 'mother' | 'other';
    status?: StudentStatus;
    password?: string;
    avatarLocalPath?: string;
    birthCertificateLocalPath?: string;
  },
) {
  const classroomId = input.classroomId ?? input.classId;
  if (!classroomId) {
    throw new HttpError(400, 'classroomId مطلوب');
  }

  let academicYearId = input.academicYearId;
  if (!academicYearId) {
    const current = await academicYearModel.findCurrentBySchool(schoolId);
    if (!current) {
      throw new HttpError(
        400,
        'لا توجد سنة دراسية حالية؛ أنشئ سنة عبر POST /api/school/academic-years أو أرسل academicYearId',
      );
    }
    academicYearId = current.id;
  }

  let firstName = input.firstName?.trim();
  let lastName = input.lastName?.trim();
  if (!firstName || lastName === undefined) {
    const split = splitFullName(input.fullName ?? '');
    firstName = firstName || split.firstName;
    lastName = lastName ?? split.lastName;
  }
  if (!firstName) throw new HttpError(400, 'firstName مطلوب');
  lastName = lastName ?? '';
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();

  const nationalId = input.nationalId?.trim() || null;
  let birthDate = input.birthDate ?? input.dateOfBirth;
  let gender = input.gender;

  if (nationalId) {
    try {
      const parsed = parseEgyptianNationalId(nationalId);
      if (!birthDate) birthDate = parsed.dateOfBirth;
      if (!gender) gender = parsed.gender;
    } catch {
      if (!birthDate || !gender) {
        throw new HttpError(400, 'الرقم القومي غير صالح؛ أرسل birthDate و gender');
      }
    }
  }
  if (!birthDate) throw new HttpError(400, 'birthDate مطلوب');
  if (!gender) throw new HttpError(400, 'gender مطلوب');

  const { year, grade } = await assertEnrollmentScope({
    schoolId,
    academicYearId,
    gradeId: input.gradeId,
    classroomId,
  });

  const relationship: StudentRelationship =
    input.relationship ??
    (input.parentRelation as StudentRelationship | undefined) ??
    'father';
  const parentName = (
    input.parentName?.trim() ||
    input.parentFullName?.trim() ||
    'ولي أمر'
  ).slice(0, 255);
  const parentEmailRaw = input.parentEmail?.trim();
  const parentEmail = parentEmailRaw ? parentEmailRaw : null;
  const studentPhoneRaw = (input.studentPhone ?? input.phone)?.trim();
  const studentPhone = studentPhoneRaw ? studentPhoneRaw : null;
  const status: StudentStatus = input.status ?? 'active';
  const parentPhoneDigits = digitsOnly(input.parentPhone);

  let avatarUrl: string | null = null;
  let birthCertificateUrl: string | null = null;
  if (input.avatarLocalPath) {
    avatarUrl = await uploadToCloudinary(input.avatarLocalPath, 'student-documents');
  }
  if (input.birthCertificateLocalPath) {
    birthCertificateUrl = await uploadToCloudinary(
      input.birthCertificateLocalPath,
      'student-documents',
    );
  }

  const yKey = yearKeyFromAcademicYear(year.start_date, year.name);
  const studentPassword = input.password?.trim() || randomPassword();
  const parentPassword = randomPassword();
  const studentHash = await bcrypt.hash(studentPassword, 10);
  const parentHash = await bcrypt.hash(parentPassword, 10);

  try {
    await pool.query('BEGIN');

    const studentCode = await studentModel.allocateStudentCode(schoolId, yKey);
    const qrPayload = buildStudentQrPayload(schoolId, studentCode);
    const studentEmail = syntheticStudentEmail(schoolId, studentCode);
    const parentEmailSynthetic = syntheticParentEmail(schoolId, parentPhoneDigits);
    let parentRow = await parentModel.findBySchoolAndPhone(schoolId, input.parentPhone);
    let parentLogin:
      | { code: string; password: string }
      | { reused: true; message: string }
      | undefined;
    let parentLoginCodeForStudent: string;

    if (!parentRow) {
      parentLoginCodeForStudent = `PAR-${randomBytes(4).toString('hex').toUpperCase()}`;
      const parentUserRes = await pool.query<{ id: number }>(
        `INSERT INTO users (email, phone, password, name, role, status, username, password_change_required)
         VALUES ($1, $2, $3, $4, 'parent', 'active', $5, TRUE)
         RETURNING id`,
        [
          parentEmail ?? parentEmailSynthetic,
          input.parentPhone,
          parentHash,
          parentName,
          parentLoginCodeForStudent,
        ],
      );
      const parentUserId = parentUserRes.rows[0]?.id;
      if (!parentUserId) throw new HttpError(500, 'فشل إنشاء حساب ولي الأمر');

      parentRow = await parentModel.insert({
        schoolId,
        fullName: parentName,
        phone: input.parentPhone,
        email: parentEmail,
        relation: mapParentRelation(relationship),
        userId: parentUserId,
      });
      parentLogin = { code: parentLoginCodeForStudent, password: parentPassword };
    } else {
      const pUser = await getUserUsername(parentRow.user_id!);
      if (!pUser) {
        throw new HttpError(500, 'حساب ولي الأمر المرتبط لا يحتوي كود دخول');
      }
      parentLoginCodeForStudent = pUser;
      parentLogin = {
        reused: true,
        message: 'ولي الأمر مسجّل مسبقًا بهذا الرقم؛ استخدم نفس كود الدخول السابق',
      };
    }

    const studentUserRes = await pool.query<{ id: number }>(
      `INSERT INTO users (email, phone, password, name, role, status, username, password_change_required)
       VALUES ($1, $2, $3, $4, 'student', 'active', $5, TRUE)
       RETURNING id`,
      [studentEmail, studentPhone, studentHash, fullName, studentCode],
    );
    const studentUserId = studentUserRes.rows[0]?.id;
    if (!studentUserId) throw new HttpError(500, 'فشل إنشاء حساب الطالب');

    const studentRow = await studentModel.insert({
      schoolId,
      academicYearId,
      gradeId: input.gradeId,
      classId: classroomId,
      studentCode,
      firstName,
      lastName,
      fullName,
      gender,
      dateOfBirth: birthDate,
      nationalId,
      avatarUrl,
      address: input.address?.trim() ? input.address.trim() : null,
      parentName,
      parentPhone: input.parentPhone,
      parentEmail,
      relationship,
      phone: studentPhone,
      status,
      gradeLabel: grade.name,
      studentLoginCode: studentCode,
      parentLoginCode: parentLoginCodeForStudent,
      qrPayload,
      userId: studentUserId,
    });

    await studentModel.linkParentStudent(parentRow.id, studentRow.id);

    if (avatarUrl) {
      await studentDocumentModel.insert({
        studentId: studentRow.id,
        fileUrl: avatarUrl,
        fileType: 'avatar',
      });
    }
    if (birthCertificateUrl) {
      await studentDocumentModel.insert({
        studentId: studentRow.id,
        fileUrl: birthCertificateUrl,
        fileType: 'birth_certificate',
      });
    }

    await pool.query('COMMIT');

    let feePlanApplication:
      | Awaited<ReturnType<typeof gradeFeePlanService.applyPlanToNewStudent>>
      | undefined;
    try {
      feePlanApplication = await gradeFeePlanService.applyPlanToNewStudent(
        schoolId,
        studentRow.id,
        input.gradeId,
      );
    } catch (err) {
      logger.warn({ err }, 'applyPlanToNewStudent failed');
    }

    return {
      student: toStudentResource(studentRow),
      parent: {
        name: parentName,
        phone: input.parentPhone,
        email: parentEmail,
        relationship,
        record: parentRow,
      },
      academicYear: year,
      grade: { id: grade.id, name: grade.name, stage: grade.stage },
      classroom: { id: classroomId },
      documents: {
        avatarUrl,
        birthCertificateUrl,
      },
      loginCodes: {
        student: {
          username: studentCode,
          password: studentPassword,
          hint: 'تسجيل الدخول بـ username = studentCode؛ يُنصح بتغيير كلمة المرور عند أول دخول (mustChangePassword)',
        },
        parent: parentLogin,
      },
      qr: {
        payload: qrPayload,
        studentId: studentCode,
      },
      feePlan: feePlanApplication,
    };
  } catch (e: unknown) {
    await pool.query('ROLLBACK').catch(() => undefined);
    const err = e as { code?: string; constraint?: string };
    if (err.code === '23505') {
      if (err.constraint?.includes('national')) {
        throw new HttpError(409, 'الرقم القومي مسجّل مسبقًا لهذه المدرسة');
      }
      if (err.constraint?.includes('student_code') || err.constraint?.includes('username')) {
        throw new HttpError(409, 'كود الطالب مكرر، أعد المحاولة');
      }
      throw new HttpError(409, 'تعارض في بيانات فريدة (رقم قومي / بريد / هاتف / كود)');
    }
    throw e;
  }
}

export async function updateStudent(
  studentId: number,
  schoolId: number,
  patch: {
    academicYearId?: number;
    gradeId?: number;
    classroomId?: number;
    classId?: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    nationalId?: string | null;
    birthDate?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female';
    address?: string | null;
    studentPhone?: string | null;
    phone?: string | null;
    parentName?: string;
    parentPhone?: string | null;
    parentEmail?: string | null;
    relationship?: StudentRelationship;
    status?: StudentStatus;
  },
) {
  const existing = await studentModel.findByIdAndSchool(studentId, schoolId);
  if (!existing) throw new HttpError(404, 'Student not found');

  const nextGradeId = patch.gradeId ?? existing.grade_id;
  const nextClassroomId = patch.classroomId ?? patch.classId ?? existing.class_id;
  const nextYearId = patch.academicYearId ?? existing.academic_year_id;

  if (
    patch.gradeId !== undefined ||
    patch.classroomId !== undefined ||
    patch.classId !== undefined ||
    patch.academicYearId !== undefined
  ) {
    await assertEnrollmentScope({
      schoolId,
      academicYearId: nextYearId,
      gradeId: nextGradeId,
      classroomId: nextClassroomId,
    });
  }

  let firstName = patch.firstName?.trim();
  let lastName = patch.lastName?.trim();
  let fullName = patch.fullName?.trim();

  if (patch.fullName && (!firstName || lastName === undefined)) {
    const split = splitFullName(patch.fullName);
    firstName = firstName ?? split.firstName;
    lastName = lastName ?? split.lastName;
  }
  if (firstName !== undefined || lastName !== undefined) {
    const fn = firstName ?? existing.first_name;
    const ln = lastName ?? existing.last_name;
    fullName = `${fn}${ln ? ` ${ln}` : ''}`.trim();
  }

  const grade =
    nextGradeId !== existing.grade_id
      ? await schoolGradeModel.findByIdAndSchool(nextGradeId, schoolId)
      : null;

  try {
    const row = await studentModel.update(studentId, schoolId, {
      academicYearId: patch.academicYearId,
      gradeId: patch.gradeId,
      classId:
        patch.classroomId !== undefined || patch.classId !== undefined
          ? nextClassroomId
          : undefined,
      firstName,
      lastName,
      fullName,
      nationalId: patch.nationalId,
      dateOfBirth: patch.birthDate ?? patch.dateOfBirth,
      gender: patch.gender,
      address: patch.address,
      phone: patch.studentPhone !== undefined ? patch.studentPhone : patch.phone,
      parentName: patch.parentName,
      parentPhone: patch.parentPhone,
      parentEmail:
        patch.parentEmail === ''
          ? null
          : patch.parentEmail !== undefined
            ? patch.parentEmail
            : undefined,
      relationship: patch.relationship,
      gradeLabel: grade?.name,
      status: patch.status,
    });
    if (!row) throw new HttpError(404, 'Student not found');

    if (fullName && row.user_id) {
      await pool.query(`UPDATE users SET name = $1 WHERE id = $2 AND role = 'student'`, [
        fullName,
        row.user_id,
      ]);
    }

    return toStudentResource(row);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      throw new HttpError(409, 'Duplicate national ID or other unique field');
    }
    throw e;
  }
}

export async function deleteStudent(studentId: number, schoolId: number) {
  const existing = await studentModel.findByIdAndSchool(studentId, schoolId);
  if (!existing) throw new HttpError(404, 'Student not found');

  const userId = await studentModel.softDelete(studentId, schoolId);
  if (userId) {
    await pool.query(
      `UPDATE users SET status = 'inactive' WHERE id = $1 AND role = 'student'`,
      [userId],
    );
  }
}
