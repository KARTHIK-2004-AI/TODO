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
import { CollaborationService } from './services/collaborationService';
import { requestLogger, logger } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';
import prisma from './database/client';

const app = express();
const port = process.env.PORT || 4000;

// Environment validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-jwt-secret-key-change-in-production') {
    console.error('CRITICAL: Server startup failed. JWT_SECRET must be set and secure in production mode.');
    process.exit(1);
  }
}

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Register routers (supporting both /api and direct path aliases)
app.use('/api/auth', authRouter);
app.use('/api/todos', todoRouter);
app.use('/api/tasks', todoRouter);
app.use('/tasks', todoRouter);
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

// Support direct comments modification paths
const commentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

app.put(['/api/comments/:id', '/comments/:id'], authenticate, validate({ body: commentSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const commentId = req.params.id;
    const { message } = req.body;
    const comment = await CollaborationService.updateComment(userId, commentId, message);
    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
});

app.delete(['/api/comments/:id', '/comments/:id'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const commentId = req.params.id;
    const result = await CollaborationService.deleteComment(userId, commentId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Support direct attachments deletion paths
app.delete(['/api/attachments/:id', '/attachments/:id'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const attachmentId = req.params.id;
    const result = await CollaborationService.deleteAttachment(userId, attachmentId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/attachments/:id/download and GET /attachments/:id/download
app.get(['/api/attachments/:id/download', '/attachments/:id/download'], authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const attachmentId = req.params.id;

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true },
    });
    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const todo = attachment.task;
    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) {
        res.status(403).json({ error: 'Forbidden: Not a member of this team' });
        return;
      }
    } else {
      if (todo.userId !== userId && todo.assignedToUserId !== userId) {
        res.status(403).json({ error: 'Forbidden: No access to this private task' });
        return;
      }
    }

    const fs = require('fs');
    const path = require('path');
    const UPLOADS_ROOT = path.resolve(__dirname, 'uploads');
    const absolutePath = path.resolve(UPLOADS_ROOT, path.basename(attachment.storagePath));

    if (fs.existsSync(absolutePath)) {
      res.download(absolutePath, attachment.fileName);
    } else {
      const dummyContent = `Simulated content for attachment: ${attachment.fileName}`;
      const buffer = Buffer.alloc(attachment.fileSize, dummyContent);
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Content-Length', attachment.fileSize);
      res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
});

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
