import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChatService } from '../services/chatService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const chatRouter = Router();

// Apply auth middleware to all chat routes
chatRouter.use(authenticate);

const postMessageSchema = z.object({
  message: z.string().min(1, 'Message text is required'),
  metadata: z.any().optional(),
});

// GET /api/teams/:teamId/chat - Fetch chat history
chatRouter.get('/:teamId/chat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.teamId;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const search = req.query.search as string | undefined;

    const chatHistory = await ChatService.getChatHistory(userId, teamId, page, limit, search);
    res.status(200).json(chatHistory);
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:teamId/chat - Post a new message
chatRouter.post(
  '/:teamId/chat',
  validate({ body: postMessageSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const teamId = req.params.teamId;
      const { message, metadata } = req.body;

      const chatMsg = await ChatService.postMessage(userId, teamId, message, metadata);
      res.status(201).json(chatMsg);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/teams/:teamId/chat/read - Mark chat as read
chatRouter.post('/:teamId/chat/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.teamId;

    const result = await ChatService.markChatAsRead(userId, teamId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default chatRouter;
