import { z } from 'zod/v4';

/** Unified login: `login` (email or phone) or legacy `username`. */
export const loginSchema = z
  .object({
    login: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (!data.login?.trim() && !data.username?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'login is required', path: ['login'] });
    }
  });

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
