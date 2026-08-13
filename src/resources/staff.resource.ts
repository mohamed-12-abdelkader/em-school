import type { StaffRow } from '../models/user.model';

export function toStaffResource(row: StaffRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: 'student_affairs' as const,
    schoolId: row.school_id,
    status: row.status,
  };
}
