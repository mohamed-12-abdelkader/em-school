import { z } from 'zod/v4';

/** تسجيل دخول موحّد: يقبل email / username / phone */
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
