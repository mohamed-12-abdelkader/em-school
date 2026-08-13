import { z } from 'zod/v4';

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' });

export function normalizeAttendanceScanBody(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...raw };
  if (out.qr_code === undefined && out.qrCode !== undefined) out.qr_code = out.qrCode;
  if (out.qr_code === undefined && out.raw !== undefined) out.qr_code = out.raw;
  return out;
}

export const attendanceScanSchema = z.object({
  qr_code: z.string().trim().min(1),
});

export function normalizeAttendanceBatchBody(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...raw };
  if (out.classroom_id === undefined) {
    out.classroom_id = out.classroomId ?? out.class_id ?? out.classId;
  }
  return out;
}

const batchRecordSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  status: z.enum(['present', 'absent']),
});

export const attendanceBatchSchema = z.object({
  classroom_id: z.coerce.number().int().positive(),
  date: dateString,
  records: z.array(batchRecordSchema).min(1).max(500),
});
