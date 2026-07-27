import { Router, Request, Response, NextFunction } from 'express';
import { CollaborationService } from '../services/collaborationService';
import { authenticate } from '../middleware/auth';

const inviteRouter = Router();

// Require authentication to accept invite
inviteRouter.use(authenticate);

// GET /api/invites/:token - Get invitation details
inviteRouter.get(
  '/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const details = await CollaborationService.getInviteDetails(token);
      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invites/:token/accept - Accept team invite
inviteRouter.post(
  '/:token/accept',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { token } = req.params;
      const result = await CollaborationService.acceptInvitation(userId, token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invites/:token/reject - Decline team invite
inviteRouter.post(
  '/:token/reject',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { token } = req.params;
      const result = await CollaborationService.rejectInvitation(userId, token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default inviteRouter;
