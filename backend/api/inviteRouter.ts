import { Router, Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/teamService';
import { authenticate } from '../middleware/auth';

const inviteRouter = Router();

// Require authentication to accept invite
inviteRouter.use(authenticate);

// POST /api/invites/:token/accept - Accept team invite
inviteRouter.post(
  '/:token/accept',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { token } = req.params;
      const result = await TeamService.acceptInvite(userId, token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default inviteRouter;
