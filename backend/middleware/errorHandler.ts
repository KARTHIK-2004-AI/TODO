import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError' || (typeof err.code === 'string' && err.code.startsWith('P'))) {
    statusCode = 400;
    if (err.code === 'P2000') {
      message = 'One of the provided values exceeds the maximum allowed length.';
    } else if (err.code === 'P2002') {
      message = 'A record with this unique identifier or email already exists.';
    } else {
      message = 'Database constraint error or invalid request payload.';
    }
  }

  if (statusCode === 500) {
    logger.error(`Unhandled Error: ${err.message}\nStack: ${err.stack}`);
    message = 'An unexpected error occurred. Please try again later.';
  } else {
    logger.warn(`API Error (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    error: message,
    ...(err.code ? { code: err.code } : {}),
  });
};
