import QRCode from 'qrcode';

export interface StudentQrPayloadV1 {
  v: 1;
  schoolId: number;
  studentId: string;
}

export function buildStudentQrPayload(schoolId: number, studentPublicId: string): string {
  const payload: StudentQrPayloadV1 = { v: 1, schoolId, studentId: studentPublicId };
  return JSON.stringify(payload);
}

export function parseStudentQrPayload(raw: string): StudentQrPayloadV1 {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('INVALID_QR');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as StudentQrPayloadV1).v !== 1 ||
    typeof (parsed as StudentQrPayloadV1).schoolId !== 'number' ||
    typeof (parsed as StudentQrPayloadV1).studentId !== 'string'
  ) {
    throw new Error('INVALID_QR');
  }
  return parsed as StudentQrPayloadV1;
}

export async function qrPayloadToPngDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
}
