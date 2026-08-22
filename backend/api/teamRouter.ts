import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '../prisma/client';
import { CollaborationService } from '../services/collaborationService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const teamRouter = Router();

// Require authentication for all team routes
teamRouter.use(authenticate);

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  purpose: z.string().max(500, 'Purpose too long').optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const updateRoleSchema = z.object({
  role: z.enum([Role.ADMIN, Role.MEMBER], {
    errorMap: () => ({ message: 'Role must be ADMIN or MEMBER' }),
  }),
});

// POST /api/teams - Create team
teamRouter.post(
  '/',
  validate({ body: createTeamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { name, description, purpose } = req.body;
      const team = await CollaborationService.createTeam(userId, name, description, purpose);
      res.status(201).json(team);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/teams - List my teams
teamRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const teams = await CollaborationService.listMyTeams(userId);
    res.status(200).json(teams);
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:teamId/status - Get team stats
teamRouter.get('/:teamId/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { teamId } = req.params;
    const team = await CollaborationService.getTeam(userId, teamId);
    res.status(200).json(team.stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:teamId - Get team details & members
teamRouter.get('/:teamId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { teamId } = req.params;
    const team = await CollaborationService.getTeam(userId, teamId);
    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
});

// PUT /api/teams/:teamId - Rename team (OWNER)
teamRouter.put(
  '/:teamId',
  validate({ body: updateTeamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { teamId } = req.params;
      const { name } = req.body;
      const updatedTeam = await CollaborationService.renameTeam(userId, teamId, name);
      res.status(200).json(updatedTeam);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/teams/:teamId - Delete team (OWNER)
teamRouter.delete('/:teamId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { teamId } = req.params;
    const result = await CollaborationService.deleteTeam(userId, teamId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:teamId/invites - Invite member (OWNER/ADMIN)
teamRouter.post(
  '/:teamId/invites',
  validate({ body: inviteMemberSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { teamId } = req.params;
      const { email } = req.body;
      const invite = await CollaborationService.inviteMember(userId, teamId, email);
      res.status(201).json(invite);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/teams/:teamId/invites/:id - Revoke invite (OWNER/ADMIN)
teamRouter.delete(
  '/:teamId/invites/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { teamId, id: inviteId } = req.params;
      const result = await CollaborationService.revokeInvitation(userId, teamId, inviteId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/teams/:teamId/members/:userId/role - Change member role (OWNER)
teamRouter.put(
  '/:teamId/members/:userId/role',
  validate({ body: updateRoleSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actingUserId = req.user!.id;
      const { teamId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const updatedMember = await CollaborationService.updateTeamRole(
        actingUserId,
        teamId,
        targetUserId,
        role
      );
      res.status(200).json(updatedMember);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/teams/:teamId/members/:userId - Remove member (OWNER/ADMIN per rules)
teamRouter.delete(
  '/:teamId/members/:userId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actingUserId = req.user!.id;
      const { teamId, userId: targetUserId } = req.params;
      const result = await CollaborationService.removeMember(actingUserId, teamId, targetUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/teams/:teamId/activity - Fetch team activity timeline
teamRouter.get(
  '/:teamId/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { teamId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const type = req.query.type as any;

      const timeline = await CollaborationService.getTeamTimeline(userId, teamId, { page, limit, type });
      res.status(200).json(timeline);
    } catch (error) {
      next(error);
    }
  }
);

export default teamRouter;
