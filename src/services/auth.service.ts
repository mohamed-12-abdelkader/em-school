import bcrypt from 'bcrypt';
import type { Pool } from 'pg';
import * as userModel from '../models/user.model';
import { HttpError, generateToken } from '../utils';

export async function loginWithUsernamePassword(username: string, password: string, pool: Pool) {
  const user = await userModel.findByLoginIdentifier(username);
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  if (
    user.status === 'inactive' ||
    user.status === 'suspended' ||
    user.status === 'deleted'
  ) {
    throw new HttpError(403, 'Account is deactivated.');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = await generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      jti: user.jti,
    },
    pool,
  );

  return {
    token,
    mustChangePassword: Boolean(user.password_change_required),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      description: user.description,
      logo: user.logo,
    },
  };
}

export async function changeOwnPassword(
  userId: number,
  oldPassword: string,
  newPassword: string,
  pool: Pool,
) {
  const user = await userModel.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw new HttpError(401, 'كلمة المرور الحالية غير صحيحة');

  const hash = await bcrypt.hash(newPassword, 10);
  await userModel.updatePasswordHash(userId, hash);

  const token = await generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      jti: user.jti,
    },
    pool,
  );

  return { token, mustChangePassword: false };
}
