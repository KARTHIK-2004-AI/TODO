import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { TeamService } from '../services/teamService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const teamRouter = Router();

// Require authentication for all team routes
teamRouter.use(authenticate);

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
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
      const { name } = req.body;
      const team = await TeamService.createTeam(userId, name);
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
    const teams = await TeamService.listMyTeams(userId);
    res.status(200).json(teams);
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:teamId - Get team details & members
teamRouter.get('/:teamId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { teamId } = req.params;
    const team = await TeamService.getTeam(userId, teamId);
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
      const updatedTeam = await TeamService.renameTeam(userId, teamId, name);
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
    const result = await TeamService.deleteTeam(userId, teamId);
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
      const invite = await TeamService.inviteMember(userId, teamId, email);
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
      const result = await TeamService.revokeInvite(userId, teamId, inviteId);
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
      const updatedMember = await TeamService.updateTeamRole(
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
      const result = await TeamService.removeMember(actingUserId, teamId, targetUserId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default teamRouter;
