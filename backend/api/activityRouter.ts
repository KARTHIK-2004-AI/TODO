import { Router, Request, Response, NextFunction } from 'express';
import { CollaborationService } from '../services/collaborationService';
import { authenticate } from '../middleware/auth';

const activityRouter = Router();

// Apply auth middleware
activityRouter.use(authenticate);

// GET /api/activity - Fetch personal & unified activity timeline
activityRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const type = req.query.type as any;

    const timeline = await CollaborationService.getTimeline(userId, { page, limit, type });
    res.status(200).json(timeline);
  } catch (error) {
    next(error);
  }
});

export default activityRouter;
