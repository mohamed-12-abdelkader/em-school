import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils';
import pool from '../db/pool';
import type { AppRole, AuthUser } from '../types/auth';

export function authMiddleware(allowedRoles: AppRole[] = []): RequestHandler {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, config.SECRET_KEY) as { id: number; jti?: string };
      const { id, jti } = decoded;

      const result = await pool.query<{
        id: number;
        role: AppRole;
        email: string | null;
        jti: string | null;
        school_id: number | null;
      }>('SELECT id, role, email, jti, school_id FROM users WHERE id = $1', [id]);
      if (!result.rowCount) return res.status(401).json({ message: 'User not found' });

      const row = result.rows[0];

      if (allowedRoles.length && !allowedRoles.includes(row.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }

      if (row.role === 'student' && row.jti !== jti) {
        return res.status(401).json({ message: 'Session expired or replaced' });
      }

      const user: AuthUser = {
        id: row.id,
        role: row.role,
        email: row.email,
        jti: row.jti,
        schoolId: row.school_id,
      };

      req.user = user;
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
