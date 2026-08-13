import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod/v4';
import { HttpError, logger } from '../utils';

interface ErrorBody {
  status: number;
  message: string;
  error: string;
  name: string;
}

const routerNotFound: RequestHandler = (_, _res, _next) => {
  throw new HttpError(404, 'Route not found');
};

const errorHandler = (err: Error, req: Request, res: Response<ErrorBody>, _: NextFunction) => {
  const loggerMsg = 'ErrorHandler';

  if (err instanceof HttpError) {
    logger.warn(err, loggerMsg);
    res.status(err.status).send({
      status: err.status,
      message: err.message,
      error: err.message,
      name: err.name,
    });
    return;
  } else if (err instanceof ZodError) {
    logger.warn(err, loggerMsg);
    res.status(400).send({
      status: 400,
      message: 'Invalid request',
      error: 'Invalid request',
      name: 'ZodError',
    });
    return;
  } else if (err instanceof Error && err.message === 'Only image files are allowed') {
    res.status(400).send({
      status: 400,
      message: err.message,
      error: err.message,
      name: 'BadRequest',
    });
    return;
  }

  logger.error(err, loggerMsg);
  res.status(500).send({
    status: 500,
    message: 'Something went wrong',
    error: 'Something went wrong',
    name: 'InternalServerError',
  });
};

export const errorHandlerMiddleware = [routerNotFound, errorHandler];
