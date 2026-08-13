import * as academicYearModel from '../models/academicYear.model';
import * as feeModel from '../models/fee.model';
import * as gradeFeePlanModel from '../models/gradeFeePlan.model';
import * as schoolGradeModel from '../models/schoolGrade.model';
import * as studentModel from '../models/student.model';
import { splitEqualInstallments, toFeePlanResource } from '../resources/gradeFeePlan.resource';
import { HttpError } from '../utils';

function roundMoney(n: number): string {
  return n.toFixed(2);
}

export async function getGradeFeePlan(schoolId: number, gradeId: number) {
  const grade = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!grade) throw new HttpError(404, 'الصف غير موجود');

  const plan = await gradeFeePlanModel.findPlanByGrade(schoolId, gradeId);
  if (!plan) {
    return toFeePlanResource(gradeId, null, []);
  }
  const installments = await gradeFeePlanModel.listPlanInstallments(plan.id);
  return toFeePlanResource(gradeId, plan, installments);
}

export async function saveGradeFeePlan(
  schoolId: number,
  gradeId: number,
  input: {
    totalAmount: number;
    installmentsCount?: number;
    installments?: { dueDate: string; amount: number }[];
  },
) {
  const grade = await schoolGradeModel.findByIdAndSchool(gradeId, schoolId);
  if (!grade) throw new HttpError(404, 'الصف غير موجود');

  let schedule = input.installments ?? [];
  if (!schedule.length) {
    const count = input.installmentsCount;
    if (!count) {
      throw new HttpError(400, 'يجب تحديد قسط واحد على الأقل');
    }
    const year = await academicYearModel.findCurrentBySchool(schoolId);
    const firstDue = year?.start_date ?? new Date().toISOString().slice(0, 10);
    schedule = splitEqualInstallments(input.totalAmount, count, firstDue);
  }

  const sum = schedule.reduce((a, x) => a + x.amount, 0);
  if (Math.abs(sum - input.totalAmount) > 0.02) {
    throw new HttpError(400, 'مجموع الأقساط يجب أن يساوي إجمالي المصروفات');
  }

  const rows = schedule.map((x, idx) => ({
    installmentNumber: idx + 1,
    dueDate: x.dueDate,
    amount: roundMoney(x.amount),
  }));

  const plan = await gradeFeePlanModel.replacePlanWithInstallments(
    schoolId,
    gradeId,
    roundMoney(input.totalAmount),
    rows,
  );

  const schedules = await gradeFeePlanModel.listPlanInstallments(plan.id);
  const studentIds = await studentModel.listStudentIdsByGrade(schoolId, gradeId);

  const skippedStudentIds: number[] = [];
  let applied = 0;

  for (const studentId of studentIds) {
    const existing = await feeModel.findLatestFeeByStudent(studentId);
    if (existing && Number(existing.paid_amount) > 0) {
      skippedStudentIds.push(studentId);
      continue;
    }
    if (existing) {
      await feeModel.deleteFeeCascade(existing.id);
    }
    await feeModel.createFeeFromPlanTemplate(studentId, plan, schedules);
    applied += 1;
  }

  return {
    ...toFeePlanResource(gradeId, plan, schedules),
    application: {
      studentsInGrade: studentIds.length,
      feesCreatedOrUpdated: applied,
      skippedStudentsWithPayments: skippedStudentIds.length,
      skippedStudentIds,
    },
  };
}

/** بعد تسجيل طالب جديد — إن وُجدت خطة للصف */
export async function applyPlanToNewStudent(schoolId: number, studentId: number, gradeId: number) {
  const plan = await gradeFeePlanModel.findPlanByGrade(schoolId, gradeId);
  if (!plan) return { applied: false as const };

  const schedules = await gradeFeePlanModel.listPlanInstallments(plan.id);
  if (!schedules.length) return { applied: false as const };

  const existing = await feeModel.findLatestFeeByStudent(studentId);
  if (existing && Number(existing.paid_amount) > 0) {
    return { applied: false as const, reason: 'يوجد رصيد مدفوع مسبقًا' };
  }
  if (existing) {
    await feeModel.deleteFeeCascade(existing.id);
  }

  await feeModel.createFeeFromPlanTemplate(studentId, plan, schedules);
  return { applied: true as const };
}
