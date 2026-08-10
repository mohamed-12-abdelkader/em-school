import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const dir = path.join(__dirname, '../../uploads/student-enrollment');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.fieldname}-${file.originalname.replace(/[^\w.-]/g, '_')}`;
    cb(null, safe);
  },
});

/** صورة شخصية + صورة شهادة ميلاد (صور فقط) */
export const uploadStudentEnrollment = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});
