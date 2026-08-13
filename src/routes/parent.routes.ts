import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { authMiddleware } from '../middleware/authentication';
import * as attendanceController from '../controllers/attendance.controller';
import * as studentFeeController from '../controllers/studentFee.controller';

const router = Router();

router.use(authMiddleware(['parent']));
router.get('/attendance', asyncWrapper(attendanceController.listParentAttendance));
router.get('/fees', asyncWrapper(studentFeeController.getParentFees));

export default router;
