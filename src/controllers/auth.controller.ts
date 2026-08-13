import type { Request, Response } from 'express';
import pool from '../db/pool';
import * as userModel from '../models/user.model';
import * as authService from '../services/auth.service';
import { HttpError } from '../utils';

export async function login(req: Request, res: Response) {
  const { login, username, password } = req.body as {
    login?: string;
    username?: string;
    password: string;
  };
  const identifier = (login ?? username ?? '').trim();
  const result = await authService.loginWithUsernamePassword(identifier, password, pool);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const row = await userModel.findById(req.user!.id);
  if (!row) throw new HttpError(404, 'User not found');

  res.json({
    mustChangePassword: Boolean(row.password_change_required),
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      description: row.description,
      logo: row.logo,
      status: row.status,
      schoolId: row.school_id,
      created_at: row.created_at,
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };
  const result = await authService.changeOwnPassword(req.user!.id, oldPassword, newPassword, pool);
  res.json(result);
}
