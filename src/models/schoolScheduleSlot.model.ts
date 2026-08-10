import pool from '../db/pool';
import type {
  DayOfWeek,
  ScheduleSlotExpandedRow,
  ScheduleSlotRow,
} from '../types/schoolSubjectsTeachers';

export async function findByIdAndSchool(
  slotId: number,
  schoolId: number,
): Promise<ScheduleSlotRow | null> {
  const res = await pool.query<ScheduleSlotRow>(
    `SELECT id, school_id, class_id, day_of_week, period, subject_id, teacher_id, created_at, updated_at
     FROM school_schedule_slots
     WHERE id = $1 AND school_id = $2`,
    [slotId, schoolId],
  );
  return res.rows[0] ?? null;
}

export async function listByClass(options: {
  schoolId: number;
  classId: number;
  dayOfWeek?: DayOfWeek;
}): Promise<ScheduleSlotExpandedRow[]> {
  const { schoolId, classId, dayOfWeek } = options;

  const params: unknown[] = [classId, schoolId];
  let where = `WHERE sss.class_id = $1 AND sss.school_id = $2`;
  if (dayOfWeek !== undefined) {
    params.push(dayOfWeek);
    where += ` AND sss.day_of_week = $${params.length}`;
  }

  const res = await pool.query<ScheduleSlotExpandedRow>(
    `SELECT
        sss.id,
        sss.school_id,
        sss.class_id,
        sss.day_of_week,
        sss.period,
        s.id AS subject_id,
        s.name AS subject_name,
        t.id AS teacher_id,
        t.name AS teacher_name
     FROM school_schedule_slots sss
     JOIN subjects s ON s.id = sss.subject_id
     JOIN school_teachers t ON t.id = sss.teacher_id
     ${where}
     ORDER BY sss.day_of_week ASC, sss.period ASC`,
    params,
  );

  return res.rows;
}

export async function create(input: {
  schoolId: number;
  classId: number;
  dayOfWeek: DayOfWeek;
  period: number;
  subjectId: number;
  teacherId: number;
}): Promise<ScheduleSlotRow> {
  const res = await pool.query<ScheduleSlotRow>(
    `INSERT INTO school_schedule_slots
       (school_id, class_id, day_of_week, period, subject_id, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, school_id, class_id, day_of_week, period, subject_id, teacher_id, created_at, updated_at`,
    [
      input.schoolId,
      input.classId,
      input.dayOfWeek,
      input.period,
      input.subjectId,
      input.teacherId,
    ],
  );
  return res.rows[0];
}

export async function update(
  slotId: number,
  schoolId: number,
  patch: { dayOfWeek?: DayOfWeek; period?: number; subjectId?: number; teacherId?: number },
): Promise<ScheduleSlotRow | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let p = 1;

  if (patch.dayOfWeek !== undefined) {
    sets.push(`day_of_week = $${p++}`);
    vals.push(patch.dayOfWeek);
  }
  if (patch.period !== undefined) {
    sets.push(`period = $${p++}`);
    vals.push(patch.period);
  }
  if (patch.subjectId !== undefined) {
    sets.push(`subject_id = $${p++}`);
    vals.push(patch.subjectId);
  }
  if (patch.teacherId !== undefined) {
    sets.push(`teacher_id = $${p++}`);
    vals.push(patch.teacherId);
  }

  if (!sets.length) return findByIdAndSchool(slotId, schoolId);

  sets.push(`updated_at = NOW()`);

  vals.push(slotId, schoolId);

  const res = await pool.query<ScheduleSlotRow>(
    `UPDATE school_schedule_slots
     SET ${sets.join(', ')}
     WHERE id = $${p} AND school_id = $${p + 1}
     RETURNING id, school_id, class_id, day_of_week, period, subject_id, teacher_id, created_at, updated_at`,
    vals,
  );

  return res.rows[0] ?? null;
}

export async function remove(slotId: number, schoolId: number): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM school_schedule_slots WHERE id = $1 AND school_id = $2`,
    [slotId, schoolId],
  );
  return Boolean(res.rowCount && res.rowCount > 0);
}

export async function removeByTeacherAndClass(options: {
  schoolId: number;
  teacherId: number;
  classId: number;
}): Promise<number> {
  const { schoolId, teacherId, classId } = options;
  const res = await pool.query(
    `DELETE FROM school_schedule_slots
     WHERE school_id = $1 AND teacher_id = $2 AND class_id = $3`,
    [schoolId, teacherId, classId],
  );
  return res.rowCount ?? 0;
}

export async function existsClassSlot(options: {
  schoolId: number;
  classId: number;
  dayOfWeek: DayOfWeek;
  period: number;
}): Promise<boolean> {
  const { schoolId, classId, dayOfWeek, period } = options;
  const res = await pool.query<{ ok: number }>(
    `SELECT 1 as ok
     FROM school_schedule_slots
     WHERE school_id = $1 AND class_id = $2 AND day_of_week = $3 AND period = $4
     LIMIT 1`,
    [schoolId, classId, dayOfWeek, period],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function existsTeacherSlot(options: {
  schoolId: number;
  teacherId: number;
  dayOfWeek: DayOfWeek;
  period: number;
}): Promise<boolean> {
  const { schoolId, teacherId, dayOfWeek, period } = options;
  const res = await pool.query<{ ok: number }>(
    `SELECT 1 as ok
     FROM school_schedule_slots
     WHERE school_id = $1 AND teacher_id = $2 AND day_of_week = $3 AND period = $4
     LIMIT 1`,
    [schoolId, teacherId, dayOfWeek, period],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function countTeacherSlotsSubjectMismatch(options: {
  schoolId: number;
  teacherId: number;
  subjectId: number;
}): Promise<number> {
  const { schoolId, teacherId, subjectId } = options;
  const res = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM school_schedule_slots
     WHERE school_id = $1 AND teacher_id = $2 AND subject_id <> $3`,
    [schoolId, teacherId, subjectId],
  );
  return Number(res.rows[0]?.c ?? 0);
}
