import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { authMiddleware } from '../middleware/authentication';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.use(authMiddleware(['parent']));
router.get('/attendance', asyncWrapper(attendanceController.listParentAttendance));

export default router;
