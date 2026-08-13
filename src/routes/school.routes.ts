import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { validate } from '../middleware/validateReq';
import { authMiddleware } from '../middleware/authentication';
import * as schoolGradeController from '../controllers/schoolGrade.controller';
import * as schoolClassController from '../controllers/schoolClass.controller';
import { createGradeSchema, updateGradeSchema } from '../validators/schoolGrade.validator';
import { createClassSchema, updateClassSchema } from '../validators/schoolClass.validator';
import * as schoolSubjectController from '../controllers/schoolSubject.controller';
import * as schoolClassSubjectController from '../controllers/schoolClassSubject.controller';
import * as schoolTeacherController from '../controllers/schoolTeacher.controller';
import * as teacherAssignmentController from '../controllers/teacherAssignment.controller';
import * as schoolScheduleController from '../controllers/schoolSchedule.controller';
import {
  addSubjectsToClassSchema,
  replaceSubjectsForClassSchema,
} from '../validators/schoolSubjectClass.validator';
import {
  createTeacherSchema,
  assignTeacherToClassesSchema,
  updateTeacherSchema,
} from '../validators/schoolTeacher.validator';
import { createSlotSchema, updateSlotSchema } from '../validators/schoolScheduleSlot.validator';
import * as studentController from '../controllers/student.controller';
import * as academicYearController from '../controllers/academicYear.controller';
import * as attendanceController from '../controllers/attendance.controller';
import {
  createStudentEnrollmentSchema,
  normalizeStudentBody,
  updateStudentSchema,
} from '../validators/student.validator';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from '../validators/academicYear.validator';
import { attendanceScanSchema } from '../validators/attendance.validator';
import { uploadStudentEnrollment } from '../config/uploadStudent';
import * as gradeFeePlanController from '../controllers/gradeFeePlan.controller';
import * as studentFeeController from '../controllers/studentFee.controller';
import {
  createTeacherAssignmentSchema,
  updateTeacherAssignmentSchema,
} from '../validators/teacherAssignment.validator';
import { upsertGradeFeePlanSchema } from '../validators/gradeFeePlan.validator';
import * as schoolController from '../controllers/school.controller';
import { schoolSettingsSchema } from '../validators/school.validator';
import { uploadSchoolLogo } from '../config/upload';

const router = Router();

const schoolAdminOnly = authMiddleware(['school_admin', 'school']);
const studentsAccess = authMiddleware(['school_admin', 'school', 'student_affairs']);

function normalizeStudentBodyMiddleware(
  req: import('express').Request,
  _res: import('express').Response,
  next: import('express').NextFunction,
) {
  req.body = normalizeStudentBody((req.body ?? {}) as Record<string, unknown>);
  next();
}

// Students (شؤون الطلاب) — school_admin + student_affairs
router.get('/students', studentsAccess, asyncWrapper(studentController.listStudents));
router.post(
  '/students',
  studentsAccess,
  uploadStudentEnrollment.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
  ]),
  normalizeStudentBodyMiddleware,
  validate(createStudentEnrollmentSchema),
  asyncWrapper(studentController.createStudent),
);
router.get('/students/:studentId/qr', studentsAccess, asyncWrapper(studentController.getStudentQr));
router.get(
  '/students/:studentId/attendance-days',
  studentsAccess,
  asyncWrapper(attendanceController.getStudentAttendanceDays),
);
router.get('/students/:studentId', studentsAccess, asyncWrapper(studentController.getStudent));
router.put(
  '/students/:studentId',
  studentsAccess,
  normalizeStudentBodyMiddleware,
  validate(updateStudentSchema),
  asyncWrapper(studentController.updateStudent),
);
router.patch(
  '/students/:studentId',
  studentsAccess,
  normalizeStudentBodyMiddleware,
  validate(updateStudentSchema),
  asyncWrapper(studentController.updateStudent),
);
router.delete(
  '/students/:studentId',
  studentsAccess,
  asyncWrapper(studentController.deleteStudent),
);

// Rest of school portal — school_admin only (fees stay exclusive)
router.use(schoolAdminOnly);

router.get('/dashboard', asyncWrapper(schoolController.getSchoolPortalDashboard));
router.get('/settings', asyncWrapper(schoolController.getOwnSettings));
router.put(
  '/settings',
  uploadSchoolLogo.single('logo'),
  validate(schoolSettingsSchema),
  asyncWrapper(schoolController.updateOwnSettings),
);

// Academic years
router.get('/academic-years', asyncWrapper(academicYearController.listAcademicYears));
router.post(
  '/academic-years',
  validate(createAcademicYearSchema),
  asyncWrapper(academicYearController.createAcademicYear),
);
router.get('/academic-years/:yearId', asyncWrapper(academicYearController.getAcademicYear));
router.put(
  '/academic-years/:yearId',
  validate(updateAcademicYearSchema),
  asyncWrapper(academicYearController.updateAcademicYear),
);
router.delete('/academic-years/:yearId', asyncWrapper(academicYearController.deleteAcademicYear));

router.get('/students/:studentId/fees', asyncWrapper(studentFeeController.getStudentFees));

router.post(
  '/attendance/scan',
  validate(attendanceScanSchema),
  asyncWrapper(attendanceController.scanAttendance),
);
router.get('/attendance', asyncWrapper(attendanceController.listAttendance));

router.post('/installments/:installmentId/pay', asyncWrapper(studentFeeController.payInstallment));

router.get('/grades', asyncWrapper(schoolGradeController.listGrades));
router.post(
  '/grades',
  validate(createGradeSchema),
  asyncWrapper(schoolGradeController.createGrade),
);

// مصروفات وأقساط على مستوى الصف
router.get('/grades/:gradeId/fee-plan', asyncWrapper(gradeFeePlanController.getGradeFeePlan));
router.put(
  '/grades/:gradeId/fee-plan',
  validate(upsertGradeFeePlanSchema),
  asyncWrapper(gradeFeePlanController.saveGradeFeePlan),
);

router.get('/grades/:gradeId/classes', asyncWrapper(schoolClassController.listClassesByGrade));
router.post(
  '/grades/:gradeId/classes',
  validate(createClassSchema),
  asyncWrapper(schoolClassController.createClassInGrade),
);

router.get('/grades/:gradeId', asyncWrapper(schoolGradeController.getGrade));
router.patch(
  '/grades/:gradeId',
  validate(updateGradeSchema),
  asyncWrapper(schoolGradeController.updateGrade),
);
router.delete('/grades/:gradeId', asyncWrapper(schoolGradeController.deleteGrade));

router.get('/classes/:classId', asyncWrapper(schoolClassController.getClassById));
router.patch(
  '/classes/:classId',
  validate(updateClassSchema),
  asyncWrapper(schoolClassController.updateClass),
);
router.delete('/classes/:classId', asyncWrapper(schoolClassController.deleteClass));

// -----------------------------
// Global Subjects
// -----------------------------
router.get('/subjects', asyncWrapper(schoolSubjectController.listSubjects));
router.get('/subjects/:subjectId', asyncWrapper(schoolSubjectController.getSubject));

// -----------------------------
// Subjects per Class
// -----------------------------
router.get(
  '/classes/:classId/subjects',
  asyncWrapper(schoolClassSubjectController.listClassSubjects),
);
router.post(
  '/classes/:classId/subjects',
  validate(addSubjectsToClassSchema),
  asyncWrapper(schoolClassSubjectController.addSubjectsToClass),
);
router.put(
  '/classes/:classId/subjects',
  validate(replaceSubjectsForClassSchema),
  asyncWrapper(schoolClassSubjectController.replaceSubjectsForClass),
);

// -----------------------------
// Teachers
// -----------------------------
router.get('/teachers', asyncWrapper(schoolTeacherController.listTeachers));
router.post(
  '/teachers',
  validate(createTeacherSchema),
  asyncWrapper(schoolTeacherController.createTeacher),
);
router.get('/teachers/:teacherId', asyncWrapper(schoolTeacherController.getTeacher));
router.put(
  '/teachers/:teacherId',
  validate(updateTeacherSchema),
  asyncWrapper(schoolTeacherController.updateTeacher),
);
router.patch(
  '/teachers/:teacherId',
  validate(updateTeacherSchema),
  asyncWrapper(schoolTeacherController.updateTeacher),
);
router.delete('/teachers/:teacherId', asyncWrapper(schoolTeacherController.deleteTeacher));

// Teacher assignments (مادة + فصل + صف + سنة)
router.get('/teacher-assignments', asyncWrapper(teacherAssignmentController.listAssignments));
router.post(
  '/teacher-assignments',
  validate(createTeacherAssignmentSchema),
  asyncWrapper(teacherAssignmentController.createAssignment),
);
router.get(
  '/teacher-assignments/:assignmentId',
  asyncWrapper(teacherAssignmentController.getAssignment),
);
router.put(
  '/teacher-assignments/:assignmentId',
  validate(updateTeacherAssignmentSchema),
  asyncWrapper(teacherAssignmentController.updateAssignment),
);
router.delete(
  '/teacher-assignments/:assignmentId',
  asyncWrapper(teacherAssignmentController.deleteAssignment),
);

// Legacy: assign teacher to classes (subject_id on teacher)
router.post(
  '/teachers/:teacherId/classes',
  validate(assignTeacherToClassesSchema),
  asyncWrapper(schoolTeacherController.assignTeacherToClasses),
);
router.delete(
  '/teachers/:teacherId/classes/:classId',
  asyncWrapper(schoolTeacherController.removeTeacherFromClass),
);

router.get(
  '/teachers/:teacherId/classes',
  asyncWrapper(schoolTeacherController.listClassesByTeacher),
);

router.get('/classes/:classId/teachers', asyncWrapper(schoolTeacherController.listTeachersByClass));

// -----------------------------
// Schedule
// -----------------------------
router.get('/classes/:classId/schedule', asyncWrapper(schoolScheduleController.listSchedule));
router.post(
  '/classes/:classId/schedule/slots',
  validate(createSlotSchema),
  asyncWrapper(schoolScheduleController.createSlot),
);
router.patch(
  '/classes/:classId/schedule/slots/:slotId',
  validate(updateSlotSchema),
  asyncWrapper(schoolScheduleController.updateSlot),
);
router.delete(
  '/classes/:classId/schedule/slots/:slotId',
  asyncWrapper(schoolScheduleController.deleteSlot),
);

export default router;
