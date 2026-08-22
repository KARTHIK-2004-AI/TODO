import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventEmitter';

export interface ActivityFilterOptions {
  page?: number;
  limit?: number;
  type?: string;
}

export class ActivityService {
  static async createActivityEvent(data: {
    teamId?: string | null;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }) {
    const log = await prisma.activityLog.create({
      data: {
        teamId: data.teamId ?? null,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? {},
      },
    });

    const logWithUser = await prisma.activityLog.findUnique({
      where: { id: log.id },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true } }
      }
    });

    if (logWithUser) {
      eventEmitter.emit('activity.created', { log: logWithUser });
    }

    return log;
  }

  private static buildWhereClause(
    userId: string,
    teamId: string | null,
    userTeamIds: string[],
    type?: string
  ) {
    const where: any = {};

    // Scoping to target team, or unified feed
    if (teamId) {
      where.teamId = teamId;
    } else {
      // Unified feed: user's personal activities OR any activities belonging to teams they are in
      where.OR = [
        { teamId: null, userId: userId },
        { teamId: { in: userTeamIds } },
      ];
    }

    // Applying type filtering
    if (type) {
      const normalized = type.trim().toLowerCase();
      if (normalized === 'todo' || normalized === 'todos') {
        where.entityType = 'Todo';
      } else if (normalized === 'team' || normalized === 'teams') {
        where.entityType = 'Team';
      } else if (normalized === 'invite' || normalized === 'invites' || normalized === 'teaminvite') {
        where.entityType = 'TeamInvite';
      } else if (normalized === 'role' || normalized === 'roles' || normalized === 'teammember') {
        where.entityType = 'TeamMember';
      } else if (normalized === 'account' || normalized === 'accounts' || normalized === 'user') {
        where.entityType = 'User';
      }
    }

    return where;
  }

  static async getTimeline(userId: string, options: ActivityFilterOptions) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, options.limit ?? 10);
    const skip = (page - 1) * limit;

    // Retrieve user's teams to build unified timeline scope
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const where = this.buildWhereClause(userId, null, teamIds, options.type);

    const [data, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  }

  static async getTeamTimeline(userId: string, teamId: string, options: ActivityFilterOptions) {
    // Verify user is member of team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, options.limit ?? 10);
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(userId, teamId, [teamId], options.type);

    const [data, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  }
}
