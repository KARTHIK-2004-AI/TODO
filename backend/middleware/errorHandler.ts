import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode === 500) {
    logger.error(`Unhandled Error: ${err.message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`API Error (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    error: message,
  });
};
