import { Router } from 'express';
import { asyncWrapper } from '../utils';
import { validate } from '../middleware/validateReq';
import { authMiddleware } from '../middleware/authentication';
import { uploadSchoolLogo } from '../config/upload';
import * as schoolController from '../controllers/school.controller';
import {
  createSchoolSchema,
  normalizeCreateSchoolBody,
  updateSchoolSchema,
  updateSchoolStatusSchema,
} from '../validators/school.validator';

const router = Router();

const adminOnly = authMiddleware(['admin']);

function normalizeCreateSchoolBodyMiddleware(
  req: import('express').Request,
  _res: import('express').Response,
  next: import('express').NextFunction,
) {
  req.body = normalizeCreateSchoolBody((req.body ?? {}) as Record<string, unknown>);
  next();
}

router.get('/dashboard', adminOnly, asyncWrapper(schoolController.getDashboard));

/** قائمة المدارس المسجّلة + بحث اختياري (للأدمن فقط) */
router.get('/schools', adminOnly, asyncWrapper(schoolController.listSchools));

router.post(
  '/schools',
  adminOnly,
  uploadSchoolLogo.single('logo'),
  normalizeCreateSchoolBodyMiddleware,
  validate(createSchoolSchema),
  asyncWrapper(schoolController.createSchool),
);

/** تفاصيل مدرسة واحدة */
router.get('/schools/:schoolId', adminOnly, asyncWrapper(schoolController.getSchool));

router.get('/schools/:schoolId/admin', adminOnly, asyncWrapper(schoolController.getSchoolAdmin));

router.put(
  '/schools/:schoolId',
  adminOnly,
  uploadSchoolLogo.single('logo'),
  validate(updateSchoolSchema),
  asyncWrapper(schoolController.updateSchool),
);

router.patch(
  '/schools/:schoolId/status',
  adminOnly,
  validate(updateSchoolStatusSchema),
  asyncWrapper(schoolController.updateSchoolStatus),
);

router.post(
  '/schools/:schoolId/registration-code',
  adminOnly,
  asyncWrapper(schoolController.createRegistrationCode),
);

router.post(
  '/schools/:schoolId/registration-code/regenerate',
  adminOnly,
  asyncWrapper(schoolController.regenerateRegistrationCode),
);

export default router;
