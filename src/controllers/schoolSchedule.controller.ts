import type { Request, Response } from 'express';
import { parsePositiveIntParam } from '../utils/pagination';
import * as scheduleService from '../services/schoolSchedule.service';
import type { DayOfWeek } from '../types/schoolSubjectsTeachers';
import { HttpError } from '../utils';
import { getAuthSchoolId } from '../utils/schoolContext';

export async function listSchedule(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const classId = parsePositiveIntParam(req.params.classId, 'classId');

  const raw = req.query.dayOfWeek as string | undefined;
  let dayOfWeek: number | undefined = undefined;
  if (raw !== undefined) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 7) throw new HttpError(400, 'Invalid dayOfWeek');
    dayOfWeek = n;
  }

  const schedule = await scheduleService.listScheduleForClass(schoolId, classId, { dayOfWeek });
  res.json({ schedule });
}

export async function createSlot(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const classId = parsePositiveIntParam(req.params.classId, 'classId');

  const body = req.body as {
    dayOfWeek: DayOfWeek;
    period: number;
    subjectId: number;
    teacherId: number;
  };

  const slot = await scheduleService.createSlot(schoolId, classId, {
    dayOfWeek: body.dayOfWeek,
    period: body.period,
    subjectId: body.subjectId,
    teacherId: body.teacherId,
  });

  res.status(201).json({ slot });
}

export async function updateSlot(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const classId = parsePositiveIntParam(req.params.classId, 'classId');
  const slotId = parsePositiveIntParam(req.params.slotId, 'slotId');

  const body = req.body as {
    dayOfWeek?: DayOfWeek;
    period?: number;
    subjectId?: number;
    teacherId?: number;
  };

  const slot = await scheduleService.updateSlot(schoolId, classId, slotId, body);
  res.json({ slot });
}

export async function deleteSlot(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const slotId = parsePositiveIntParam(req.params.slotId, 'slotId');
  await scheduleService.deleteSlot(schoolId, slotId);
  res.status(204).send();
}
