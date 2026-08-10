import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { validate } from '../middleware/validateReq';
import { authMiddleware } from '../middleware/authentication';
import * as authController from '../controllers/auth.controller';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), asyncWrapper(authController.login));
router.get('/me', authMiddleware(), asyncWrapper(authController.me));
router.patch(
  '/password',
  authMiddleware(),
  validate(changePasswordSchema),
  asyncWrapper(authController.changePassword),
);

export default router;
