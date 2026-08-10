import express, { Request } from 'express';
import { config, loggerMiddleware } from './utils';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import cors, { CorsOptionsDelegate } from 'cors';
import { router } from './routes';
import path from 'path';

const allowedOrigins = config.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes('*');

const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
  const requestOrigin = req.header('Origin') || '';
  const isAllowed =
    allowAllOrigins || !requestOrigin || allowedOrigins.includes(requestOrigin);

  callback(null, {
    // `true` reflects the request Origin (required when credentials: true; `*` is invalid with credentials)
    origin: isAllowed,
    credentials: true,
  });
};

export const app = express();

app.use(cors(corsOptionsDelegate));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// Routes
app.use('/api', router);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(errorHandlerMiddleware);
