export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRow {
  id: number;
  school_id: number;
  student_internal_id: number;
  student_id: string;
  attendance_date: string;
  attendance_time: string;
  status: AttendanceStatus;
  created_at: Date;
}
