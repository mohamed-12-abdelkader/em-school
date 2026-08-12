import type { Request, Response } from 'express';
import * as academicYearService from '../services/academicYear.service';
import { parsePagination, parsePositiveIntParam } from '../utils/pagination';
import { getAuthSchoolId } from '../utils/schoolContext';

export async function listAcademicYears(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const { limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const result = await academicYearService.listAcademicYears(schoolId, limit, skip);
  res.json(result);
}

export async function createAcademicYear(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const year = await academicYearService.createAcademicYear(schoolId, req.body);
  res.status(201).json({ academicYear: year });
}

export async function getAcademicYear(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const yearId = parsePositiveIntParam(req.params.yearId, 'yearId');
  const academicYear = await academicYearService.getAcademicYear(yearId, schoolId);
  res.json({ academicYear });
}

export async function updateAcademicYear(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const yearId = parsePositiveIntParam(req.params.yearId, 'yearId');
  const academicYear = await academicYearService.updateAcademicYear(yearId, schoolId, req.body);
  res.json({ academicYear });
}

export async function deleteAcademicYear(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const yearId = parsePositiveIntParam(req.params.yearId, 'yearId');
  await academicYearService.deleteAcademicYear(yearId, schoolId);
  res.status(204).send();
}
