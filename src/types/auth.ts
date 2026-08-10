export type AppRole = 'admin' | 'school' | 'student' | 'teacher' | 'manager' | 'parent';

/** Payload used when issuing JWTs */
export interface TokenUser {
  id: number;
  role: string;
  email?: string | null;
  jti?: string | null;
}

export interface AuthUser {
  id: number;
  role: AppRole;
  email: string | null;
  jti: string | null;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string | null;
  role: AppRole;
  description: string | null;
  logo: string | null;
  status: string | null;
  created_at: Date;
}
