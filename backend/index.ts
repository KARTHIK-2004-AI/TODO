import dotenv from 'dotenv';
import path from 'path';
// Load environment variables before importing other modules
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import express, { Request, Response } from 'express';
import cors from 'cors';
import authRouter from './api/authRouter';
import todoRouter from './api/todoRouter';
import profileRouter from './api/profileRouter';
import accountRouter from './api/accountRouter';
import teamRouter from './api/teamRouter';
import inviteRouter from './api/inviteRouter';
import notificationRouter from './api/notificationRouter';
import activityRouter from './api/activityRouter';
import chatRouter from './api/chatRouter';
import { EmailService } from './services/emailService';
import './services/eventService';
import { requestLogger, logger } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.NODE_ENV === 'test' ? (process.env.TEST_PORT || 4001) : (process.env.PORT || 4000);

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use(requestLogger);

// Health check endpoint
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Domain Router Mounts (supporting both /api prefix and direct path aliases)
app.use('/api/auth', authRouter);

app.use('/api/todos', todoRouter);
app.use('/api/tasks', todoRouter);
app.use('/tasks', todoRouter);
app.use('/api', todoRouter); // Handles /api/comments/* and /api/attachments/*

app.use('/api/profile', profileRouter);
app.use('/profile', profileRouter);

app.use('/api/account', accountRouter);
app.use('/account', accountRouter);
app.use('/api', accountRouter); // Handles /api/change-password

app.use('/api/teams', chatRouter);
app.use('/teams', chatRouter);
app.use('/api/teams', teamRouter);
app.use('/teams', teamRouter);

app.use('/api/invites', inviteRouter);
app.use('/invites', inviteRouter);

app.use('/api/notifications', notificationRouter);
app.use('/api/activity', activityRouter);

// Catch-all for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use(errorHandler);

import http from 'http';
import { initWebSocketServer } from './services/websocketService';

const server = http.createServer(app);

initWebSocketServer(server);

const serverInstance = server.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  if (process.env.NODE_ENV !== 'test') {
    EmailService.startWorker();
  }
});

export { serverInstance as server };
export default app;
