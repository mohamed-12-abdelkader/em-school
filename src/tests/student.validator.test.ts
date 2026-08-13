import { describe, expect, it } from 'vitest';
import {
  createStudentEnrollmentSchema,
  normalizeStudentBody,
  updateStudentSchema,
} from '../validators/student.validator';

describe('student.validator (unit)', () => {
  it('accepts spec snake_case create body', () => {
    const normalized = normalizeStudentBody({
      first_name: 'Ahmed',
      last_name: 'Mohamed',
      national_id: '30105101234567',
      grade_id: '2',
      classroom_id: '5',
      photo: 'https://cdn.example.com/a.png',
      parent_phone: '01011111111',
      parent_whatsapp_number: '01022222222',
    });

    const parsed = createStudentEnrollmentSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName).toBe('Ahmed');
      expect(parsed.data.lastName).toBe('Mohamed');
      expect(parsed.data.nationalId).toBe('30105101234567');
      expect(parsed.data.gradeId).toBe(2);
      expect(parsed.data.classroomId).toBe(5);
      expect(parsed.data.parentPhone).toBe('01011111111');
      expect(parsed.data.parentWhatsappNumber).toBe('01022222222');
      expect(parsed.data.photo).toBe('https://cdn.example.com/a.png');
    }
  });

  it('does not overwrite camelCase when both are sent', () => {
    const normalized = normalizeStudentBody({
      firstName: 'Keep',
      first_name: 'Ignore',
      lastName: 'Me',
      gradeId: 3,
      classroomId: 9,
      parentPhone: '01000000000',
      nationalId: '30105101234567',
    });
    const parsed = createStudentEnrollmentSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName).toBe('Keep');
    }
  });

  it('accepts PATCH classroom_id + status', () => {
    const normalized = normalizeStudentBody({
      classroom_id: '8',
      status: 'transferred',
    });
    const parsed = updateStudentSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.classroomId).toBe(8);
      expect(parsed.data.status).toBe('transferred');
    }
  });
});
