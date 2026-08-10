import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { authMiddleware } from '../middleware/authentication';
import { teacherAuthMiddleware } from '../middleware/teacherAuthorization';
import * as teacherPortalController from '../controllers/teacherPortal.controller';

const router = Router();

router.use(authMiddleware(['teacher']));
router.use(teacherAuthMiddleware());

router.get('/me', asyncWrapper(teacherPortalController.getMe));
router.get('/assignments', asyncWrapper(teacherPortalController.listMyAssignments));

export default router;
