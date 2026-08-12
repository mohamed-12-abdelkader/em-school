/**
 * Legacy / shared DB-related types.
 * Prefer `src/types/auth.ts` for auth and API shapes.
 */
import { z } from 'zod';

export const UserUpdate = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  role: z.enum(['student', 'admin', 'teacher', 'school', 'school_admin']).optional(),
});
