import type { Request, Response } from 'express';
import * as teacherAssignmentService from '../services/teacherAssignment.service';
import { toTeacherResource } from '../resources/teacher.resource';
import * as teacherModel from '../models/schoolTeacher.model';

export async function getMe(req: Request, res: Response) {
  const teacher = req.teacher!;
  const row = await teacherModel.findByIdAndSchool(teacher.id, teacher.schoolId);
  if (!row) {
    res.status(404).json({ message: 'Teacher not found' });
    return;
  }
  res.json({ teacher: toTeacherResource(row) });
}

export async function listMyAssignments(req: Request, res: Response) {
  const teacher = req.teacher!;
  const assignments = await teacherAssignmentService.listAssignmentsForTeacherUser(
    teacher.schoolId,
    teacher.id,
  );
  res.json({ assignments });
}
