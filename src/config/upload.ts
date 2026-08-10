import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const logoDir = path.join(__dirname, '../../uploads/school-logos');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(logoDir, { recursive: true });
    cb(null, logoDir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, '_')}`;
    cb(null, safe);
  },
});

export const uploadSchoolLogo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});
