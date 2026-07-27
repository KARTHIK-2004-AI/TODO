import dotenv from 'dotenv';
import path from 'path';
// Load environment variables before importing other modules
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import authRouter from './api/authRouter';
import todoRouter from './api/todoRouter';
import profileRouter from './api/profileRouter';
import accountRouter from './api/accountRouter';
import teamRouter from './api/teamRouter';
import inviteRouter from './api/inviteRouter';
import notificationRouter from './api/notificationRouter';
import activityRouter from './api/activityRouter';
import { authenticate } from './middleware/auth';
import { validate } from './middleware/validation';
import { UserService } from './services/userService';
import { requestLogger, logger } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Register routers (supporting both /api and direct path aliases)
app.use('/api/auth', authRouter);
app.use('/api/todos', todoRouter);
app.use('/api/profile', profileRouter);
app.use('/profile', profileRouter);
app.use('/api/account', accountRouter);
app.use('/account', accountRouter);
app.use('/api/teams', teamRouter);
app.use('/teams', teamRouter);
app.use('/api/invites', inviteRouter);
app.use('/invites', inviteRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/activity', activityRouter);

// Support direct PUT /change-password and PUT /api/change-password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const handlePasswordChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    const result = await UserService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

app.put('/api/change-password', authenticate, validate({ body: changePasswordSchema }), handlePasswordChange);
app.put('/change-password', authenticate, validate({ body: changePasswordSchema }), handlePasswordChange);

// Catch-all for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;
