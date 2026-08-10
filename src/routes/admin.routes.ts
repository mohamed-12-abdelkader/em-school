import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { validate } from '../middleware/validateReq';
import { authMiddleware } from '../middleware/authentication';
import { uploadSchoolLogo } from '../config/upload';
import * as schoolController from '../controllers/school.controller';
import { createSchoolSchema } from '../validators/school.validator';

const router = Router();

/** قائمة المدارس المسجّلة + بحث اختياري (للأدمن فقط) */
router.get('/schools', authMiddleware(['admin']), asyncWrapper(schoolController.listSchools));

/** تفاصيل مدرسة واحدة */
router.get(
  '/schools/:schoolId',
  authMiddleware(['admin']),
  asyncWrapper(schoolController.getSchool),
);

router.post(
  '/schools',
  authMiddleware(['admin']),
  uploadSchoolLogo.single('logo'),
  validate(createSchoolSchema),
  asyncWrapper(schoolController.createSchool),
);

export default router;
