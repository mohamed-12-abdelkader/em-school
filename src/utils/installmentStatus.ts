export type PublicInstallmentStatus = 'upcoming' | 'due' | 'overdue' | 'paid';

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Map stored paid/unpaid + due date → public status machine. */
export function toPublicInstallmentStatus(
  stored: string,
  dueDate: string,
  today = todayIsoDate(),
): PublicInstallmentStatus {
  if (stored === 'paid') return 'paid';
  if (dueDate > today) return 'upcoming';
  if (dueDate === today) return 'due';
  return 'overdue';
}
