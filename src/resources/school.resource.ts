import type { SchoolRow } from '../models/school.model';
import type { SchoolAdminRow } from '../models/user.model';
import type { RegistrationCodeRow } from '../models/registrationCode.model';

export function toRegistrationCodeResource(row: RegistrationCodeRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    status: row.status,
    created_at: row.created_at,
    revoked_at: row.revoked_at,
  };
}

export function toSchoolResource(row: SchoolRow, registrationCode?: RegistrationCodeRow | null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logo: row.logo,
    address: row.address,
    contactPhone: row.contact_phone,
    status: row.status,
    created_at: row.created_at,
    ...(registrationCode
      ? { registrationCode: toRegistrationCodeResource(registrationCode) }
      : registrationCode === null
        ? { registrationCode: null }
        : {}),
  };
}

export function toSchoolListItem(row: SchoolRow) {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo,
    status: row.status,
  };
}

export function toSchoolAdminResource(row: SchoolAdminRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: 'school_admin' as const,
    schoolId: row.school_id,
    status: row.status,
  };
}
