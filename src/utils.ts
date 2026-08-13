import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import crypto from 'node:crypto';
import { bool, cleanEnv, num, port, str, testOnly } from 'envalid';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { NextFunction, RequestHandler, Request, Response } from 'express';
import type { TokenUser } from './types/auth';
import { Pool } from 'pg';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';

// Utils functions
export const asyncWrapper = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Logger
export const logger = pino({
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

export const loggerMiddleware = pinoHttp({
  logger: logger.child({ category: 'HttpEvent' }),
  genReqId: function (req, res) {
    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  quietReqLogger: true,
});

export class HttpError extends Error {
  readonly status: number;
  readonly message: string;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.message = message;
  }
}

// Config
export const config = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
  FRONTEND_HOST: str({ default: 'http://localhost:3000' }),
  PORT: port({ default: 8000 }),
  SECRET_KEY: str({ devDefault: testOnly(crypto.randomBytes(32).toString('hex')) }),
  ACCESS_TOKEN_EXPIRE_MINUTES: num({ default: 60 * 24 * 8 }), // 8 days
  COMMON_TOKEN_EXPIRE_HOURS: num({ default: 8 }),

  // Database
  DATABASE_URL: str({ default: 'postgresql://localhost:5432/schools_systems' }),

  // First admin seed (see db/migrate.ts)
  FIRST_SUPERUSER: str({ default: undefined }),
  FIRST_SUPERUSER_PASSWORD: str({ default: undefined }),
  FIRST_SUPERUSER_NAME: str({ default: 'next school' }),
  /** If set, migrate one admin row from this email to FIRST_SUPERUSER (then remove from .env). */
  FIRST_SUPERUSER_PREVIOUS_EMAIL: str({ default: undefined }),

  // Emails
  SMTP_HOST: str({ default: undefined }),
  SMTP_USER: str({ default: undefined }),
  SMTP_PASSWORD: str({ default: undefined }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_TLS: bool({ default: true }),
  SMTP_SSL: bool({ default: false }),
  EMAILS_FROM_EMAIL: str({ default: undefined }),
  EMAILS_FROM_NAME: str({ default: undefined }),

  // CDN
  CLOUDINARY_URL: str({ default: 'cloudinary://dummy:dummy@dummy' }),

  // Meta WhatsApp Cloud API (absence alerts). Empty = hook is a no-op.
  WHATSAPP_TOKEN: str({ default: '' }),
  WHATSAPP_PHONE_NUMBER_ID: str({ default: '' }),
  WHATSAPP_API_VERSION: str({ default: 'v21.0' }),
  WHATSAPP_TEMPLATE_NAME: str({ default: '' }),
  WHATSAPP_TEMPLATE_LANG: str({ default: 'ar' }),
});

// Security
export async function generateToken(user: TokenUser, pool: Pool): Promise<string> {
  const jti = crypto.randomUUID();

  if (user.role === 'student') {
    await pool.query('UPDATE users SET jti = $1 WHERE id = $2', [jti, user.id]);
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    jti,
  };

  return jwt.sign(payload, config.SECRET_KEY, {
    expiresIn: '7d',
  });
}

export const verifyToken = (token: string) => jwt.verify(token, config.SECRET_KEY);

// Emails
const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: 'EM Online Academy',
    to,
    subject,
    html,
  });
}

// Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const unlinkFile = util.promisify(fs.unlink);

cloudinary.config();

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'school-logos',
): Promise<string> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
  });
  await unlinkFile(filePath);
  return result.secure_url;
};
