import type { Request, Response } from 'express';
import * as teacherAssignmentService from '../services/teacherAssignment.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

function parseOptionalInt(q: Record<string, unknown>, key: string): number | undefined {
  const raw = q[key];
  if (raw === undefined || raw === '') return undefined;
  return parsePositiveIntParam(String(raw), key);
}

export async function listAssignments(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const query = req.query as Record<string, unknown>;
  const { limit, skip } = parsePagination(query);

  const result = await teacherAssignmentService.listAssignments(schoolId, {
    limit,
    skip,
    teacherId: parseOptionalInt(query, 'teacherId'),
    academicYearId: parseOptionalInt(query, 'academicYearId'),
    gradeId: parseOptionalInt(query, 'gradeId'),
    classroomId: parseOptionalInt(query, 'classroomId'),
    subjectId: parseOptionalInt(query, 'subjectId'),
    q: typeof query.q === 'string' ? query.q : undefined,
  });
  res.json(result);
}

export async function getAssignment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const assignmentId = parsePositiveIntParam(req.params.assignmentId, 'assignmentId');
  const assignment = await teacherAssignmentService.getAssignment(assignmentId, schoolId);
  res.json({ assignment });
}

export async function createAssignment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const body = req.body as {
    academicYearId: number;
    teacherId: number;
    gradeId: number;
    classroomId: number;
    subjectId: number;
  };
  const assignment = await teacherAssignmentService.createAssignment(schoolId, body);
  res.status(201).json({ assignment });
}

export async function updateAssignment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const assignmentId = parsePositiveIntParam(req.params.assignmentId, 'assignmentId');
  const assignment = await teacherAssignmentService.updateAssignment(
    assignmentId,
    schoolId,
    req.body,
  );
  res.json({ assignment });
}

export async function deleteAssignment(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const assignmentId = parsePositiveIntParam(req.params.assignmentId, 'assignmentId');
  await teacherAssignmentService.deleteAssignment(assignmentId, schoolId);
  res.status(204).send();
}
