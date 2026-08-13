import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { validate } from '../middleware/validateReq';
import { authMiddleware } from '../middleware/authentication';
import * as staffController from '../controllers/staff.controller';
import { createStaffSchema, updateStaffStatusSchema } from '../validators/staff.validator';

const router = Router();

router.use(authMiddleware(['school_admin', 'school']));

router.post('/staff', validate(createStaffSchema), asyncWrapper(staffController.createStaff));
router.patch(
  '/staff/:id/status',
  validate(updateStaffStatusSchema),
  asyncWrapper(staffController.updateStaffStatus),
);

export default router;
