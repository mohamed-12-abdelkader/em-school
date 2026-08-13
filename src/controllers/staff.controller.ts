import type { Request, Response } from 'express';
import * as staffService from '../services/staff.service';
import { getAuthSchoolId } from '../utils/schoolContext';
import { parsePositiveIntParam } from '../utils/pagination';

export async function createStaff(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const body = req.body as { name: string; email: string; phone: string; password: string };
  const staff = await staffService.createStaff(schoolId, body);
  res.status(201).json(staff);
}

export async function updateStaffStatus(req: Request, res: Response) {
  const schoolId = getAuthSchoolId(req);
  const staffId = parsePositiveIntParam(req.params.id, 'id');
  const { status } = req.body as { status: 'active' | 'inactive' };
  const result = await staffService.updateStaffStatus(schoolId, staffId, status);
  res.json(result);
}
