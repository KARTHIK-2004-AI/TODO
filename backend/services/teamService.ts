import crypto from 'crypto';
import prisma from '../database/client';
import { Role, InviteStatus } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventService';

export class TeamService {
  /**
   * Creates a new team and assigns creator as OWNER.
   */
  static async createTeam(userId: string, name: string, description?: string, purpose?: string) {
    const team = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          ownerId: userId,
          description: description || '',
          purpose: purpose || '',
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: Role.OWNER,
        },
      });

      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      });
    });

    if (team) {
      eventEmitter.emit('team.created', { team, actingUserId: userId });
    }

    return team;
  }

  /**
   * Retrieves team details & member list. Requester must be a member.
   */
  static async getTeam(userId: string, teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
          },
        },
        invites: true,
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const membership = team.members.find((m) => m.userId === userId);
    if (!membership) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    // Hide invites list from regular members if appropriate, or return full details
    if (membership.role === Role.MEMBER) {
      const { invites, ...teamWithoutInvites } = team;
      return teamWithoutInvites;
    }

    return team;
  }

  /**
   * Lists all teams the authenticated user belongs to.
   */
  static async listMyTeams(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarUrl: true },
                },
              },
            },
            invites: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.team,
      myRole: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.team._count.members,
    }));
  }

  /**
   * Renames a team (OWNER only).
   */
  static async renameTeam(actingUserId: string, teamId: string, name: string) {
    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    if (actingMember.role !== Role.OWNER) {
      throw new AppError('Only the team owner can rename a team', 403, 'INSUFFICIENT_ROLE');
    }

    const oldTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { name },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
          },
        },
        invites: true,
      },
    });

    eventEmitter.emit('team.renamed', { team: updatedTeam, oldName: oldTeam?.name || '', actingUserId });

    return updatedTeam;
  }

  /**
   * Updates a member's role (OWNER only).
   */
  static async updateTeamRole(
    actingUserId: string,
    teamId: string,
    targetUserId: string,
    newRole: Role
  ) {
    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    if (actingMember.role !== Role.OWNER) {
      throw new AppError('Only team owner can change member roles', 403, 'INSUFFICIENT_ROLE');
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      include: { user: true, team: true },
    });

    if (!targetMember) {
      throw new AppError('Member not found in team', 404);
    }

    if (targetMember.role === Role.OWNER && newRole !== Role.OWNER) {
      throw new AppError('Cannot demote team owner', 403, 'INSUFFICIENT_ROLE');
    }

    const oldRole = targetMember.role;

    const updatedMember = await prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    eventEmitter.emit('team.role_updated', {
      teamId,
      teamName: targetMember.team.name,
      targetUserId,
      targetName: targetMember.user.name,
      oldRole,
      newRole,
      actingUserId,
    });

    return updatedMember;
  }

  /**
   * Removes a member from a team.
   */
  static async removeMember(actingUserId: string, teamId: string, targetUserId: string) {
    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      include: { user: true, team: true },
    });

    if (!targetMember) {
      throw new AppError('Member not found in team', 404);
    }

    if (targetMember.role === Role.OWNER) {
      throw new AppError('Team owner cannot be removed', 403, 'INSUFFICIENT_ROLE');
    }

    if (actingMember.role === Role.MEMBER) {
      throw new AppError('Regular members cannot remove team members', 403, 'INSUFFICIENT_ROLE');
    }

    if (actingMember.role === Role.ADMIN && targetMember.role !== Role.MEMBER) {
      throw new AppError('Admins can only remove regular members', 403, 'INSUFFICIENT_ROLE');
    }

    await prisma.teamMember.delete({
      where: { id: targetMember.id },
    });

    eventEmitter.emit('team.member_removed', {
      teamId,
      teamName: targetMember.team.name,
      targetUserId,
      targetName: targetMember.user.name,
      actingUserId,
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Deletes a team (OWNER only) with non-destructive detach.
   */
  static async deleteTeam(actingUserId: string, teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember || actingMember.role !== Role.OWNER) {
      throw new AppError('Only the team owner can delete a team', 403, 'INSUFFICIENT_ROLE');
    }

    const membersList = team.members.map((m) => m.userId);
    const teamName = team.name;

    // Atomic 4-step transaction for non-destructive detach
    await prisma.$transaction(async (tx) => {
      // 1. Detach all team todos to make them private
      await tx.todo.updateMany({
        where: { teamId },
        data: { teamId: null },
      });

      // 2. Delete member rows
      await tx.teamMember.deleteMany({
        where: { teamId },
      });

      // 3. Delete invite rows
      await tx.teamInvite.deleteMany({
        where: { teamId },
      });

      // 4. Delete team row
      await tx.team.delete({
        where: { id: teamId },
      });
    });

    eventEmitter.emit('team.deleted', {
      teamId,
      teamName,
      members: membersList,
      actingUserId,
    });

    return { message: 'Team deleted successfully' };
  }
}
