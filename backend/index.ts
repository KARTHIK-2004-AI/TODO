import dotenv from 'dotenv';
import path from 'path';
// Load environment variables before importing other modules
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import authRouter from './api/authRouter';
import todoRouter from './api/todoRouter';
import { requestLogger, logger } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/todos', todoRouter);

// Catch-all for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
