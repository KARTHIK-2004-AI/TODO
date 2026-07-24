import crypto from 'crypto';
import prisma from '../database/client';
import { Role, InviteStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class TeamService {
  /**
   * Creates a new team and assigns creator as OWNER.
   */
  static async createTeam(userId: string, name: string) {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          ownerId: userId,
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

    return prisma.team.update({
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
    });

    if (!targetMember) {
      throw new AppError('Member not found in team', 404);
    }

    if (targetMember.role === Role.OWNER && newRole !== Role.OWNER) {
      throw new AppError('Cannot demote team owner', 403, 'INSUFFICIENT_ROLE');
    }

    return prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
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

    return { message: 'Member removed successfully' };
  }

  /**
   * Deletes a team (OWNER only) with non-destructive detach.
   */
  static async deleteTeam(actingUserId: string, teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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

    return { message: 'Team deleted successfully' };
  }

  /**
   * Invites a member to a team by email (OWNER or ADMIN).
   */
  static async inviteMember(actingUserId: string, teamId: string, email: string) {
    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    if (actingMember.role === Role.MEMBER) {
      throw new AppError('Regular members cannot invite new members', 403, 'INSUFFICIENT_ROLE');
    }

    // Check if user with email is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (existingMember) {
        throw new AppError('User is already a member of this team', 400);
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.teamInvite.create({
      data: {
        teamId,
        email,
        invitedByUserId: actingUserId,
        token,
        status: InviteStatus.PENDING,
        expiresAt,
      },
    });
  }

  /**
   * Accepts a team invite using a token.
   */
  static async acceptInvite(userId: string, token: string) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new AppError('Invite expired, revoked, or invalid', 410, 'INVITE_EXPIRED_OR_REVOKED');
    }

    return prisma.$transaction(async (tx) => {
      // Check if already a member
      const existingMember = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: invite.teamId, userId } },
      });

      let teamMember = existingMember;
      if (!existingMember) {
        teamMember = await tx.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId,
            role: Role.MEMBER,
          },
        });
      }

      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });

      return {
        message: 'Invite accepted successfully',
        teamMember,
      };
    });
  }

  /**
   * Revokes a pending invite (OWNER or ADMIN).
   */
  static async revokeInvite(actingUserId: string, teamId: string, inviteId: string) {
    const actingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: actingUserId } },
    });

    if (!actingMember) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    if (actingMember.role === Role.MEMBER) {
      throw new AppError('Regular members cannot revoke invites', 403, 'INSUFFICIENT_ROLE');
    }

    const invite = await prisma.teamInvite.findFirst({
      where: { id: inviteId, teamId },
    });

    if (!invite) {
      throw new AppError('Invite not found', 404);
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.REVOKED },
    });

    return { message: 'Invite revoked successfully' };
  }
}
