import type { SchoolAccountRow } from '../models/user.model';
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

export function toSchoolAdminResource(
  row: SchoolAccountRow,
  registrationCode?: RegistrationCodeRow | null,
) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    username: row.username,
    description: row.description,
    logo: row.logo,
    address: row.address,
    contactPhone: row.contact_phone,
    status: row.status,
    role: row.role,
    created_at: row.created_at,
    ...(registrationCode
      ? { registrationCode: toRegistrationCodeResource(registrationCode) }
      : registrationCode === null
        ? { registrationCode: null }
        : {}),
  };
}
