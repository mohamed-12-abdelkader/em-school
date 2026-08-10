import { Router } from 'express';
import { asyncWrapper } from './utils';
import { validate } from './middleware/validateReq';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import schoolPortalRoutes from './routes/school.routes';
import parentPortalRoutes from './routes/parent.routes';
import teacherPortalRoutes from './routes/teacher.routes';
import * as authController from './controllers/auth.controller';
import { loginSchema } from './validators/auth.validator';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/school', schoolPortalRoutes);
router.use('/parent', parentPortalRoutes);
router.use('/teacher', teacherPortalRoutes);

/** نفس POST /auth/login — تسجيل دخول موحّد */
router.post('/login', validate(loginSchema), asyncWrapper(authController.login));
