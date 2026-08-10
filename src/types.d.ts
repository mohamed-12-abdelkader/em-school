// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as express from 'express';
import type { AuthUser } from './types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      teacher?: {
        id: number;
        schoolId: number;
        employeeCode: string;
        fullName: string;
        userId: number;
      };
    }
  }
}
