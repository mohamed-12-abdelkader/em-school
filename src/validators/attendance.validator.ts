import { z } from 'zod/v4';

export const attendanceScanSchema = z.object({
  raw: z.string().min(1),
});
