import { z } from 'zod/v4';

const optionalText = z
  .string()
  .max(2000)
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v));

const optionalNullableText = z
  .string()
  .max(2000)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v));

/**
 * Accept nested target shape, or flat multipart fields from older clients.
 * Also parses JSON strings when school/admin arrive as multipart text fields.
 */
export function normalizeCreateSchoolBody(raw: Record<string, unknown>) {
  const parseMaybeJson = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) return value;
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  };

  const schoolRaw = parseMaybeJson(raw.school);
  const adminRaw = parseMaybeJson(raw.admin);

  const schoolObj =
    schoolRaw && typeof schoolRaw === 'object' && !Array.isArray(schoolRaw)
      ? (schoolRaw as Record<string, unknown>)
      : {};
  const adminObj =
    adminRaw && typeof adminRaw === 'object' && !Array.isArray(adminRaw)
      ? (adminRaw as Record<string, unknown>)
      : {};

  return {
    school: {
      name: schoolObj.name ?? raw['school[name]'] ?? raw.name,
      description: schoolObj.description ?? raw['school[description]'] ?? raw.description,
      logo: schoolObj.logo ?? raw['school[logo]'] ?? raw.logoUrl,
      address: schoolObj.address ?? raw['school[address]'] ?? raw.address,
      contactPhone: schoolObj.contactPhone ?? raw['school[contactPhone]'] ?? raw.contactPhone,
    },
    admin: {
      email: adminObj.email ?? raw['admin[email]'] ?? raw.email,
      password: adminObj.password ?? raw['admin[password]'] ?? raw.password,
      name: adminObj.name ?? raw['admin[name]'] ?? raw.adminName,
    },
  };
}

export const createSchoolSchema = z.object({
  school: z.object({
    name: z.string().min(2).max(200).trim(),
    description: optionalText,
    logo: z.string().url().optional(),
    address: optionalText,
    contactPhone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v === undefined || v === '' ? undefined : v)),
  }),
  admin: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(128),
    name: z
      .string()
      .min(2)
      .max(200)
      .trim()
      .optional()
      .transform((v) => (v === undefined || v === '' ? undefined : v)),
  }),
});

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  description: optionalNullableText,
  address: optionalNullableText,
  contactPhone: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  logo: z.string().url().optional(),
});

export const updateSchoolStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted']),
});
