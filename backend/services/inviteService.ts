import crypto from 'crypto';
import prisma from '../database/client';
import { Role, InviteStatus } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventService';

export class InviteService {
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

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    const invite = await prisma.teamInvite.create({
      data: {
        teamId,
        email,
        invitedByUserId: actingUserId,
        token,
        status: InviteStatus.PENDING,
        expiresAt,
      },
    });

    eventEmitter.emit('team.invited', {
      invite,
      teamName: team?.name || '',
      actingUserId,
    });

    return invite;
  }

  /**
   * Accepts a team invite using a token.
   */
  static async acceptInvite(userId: string, token: string) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new AppError('Invite expired, revoked, or invalid', 410, 'INVITE_EXPIRED_OR_REVOKED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const result = await prisma.$transaction(async (tx) => {
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
        teamMember: teamMember!,
      };
    });

    eventEmitter.emit('team.invite_accepted', {
      invite,
      teamName: invite.team.name,
      userId,
      userName: user?.name || '',
      memberId: result.teamMember.id,
      ownerId: invite.team.ownerId,
    });

    return result;
  }

  /**
   * Rejects/declines a pending team invitation by token.
   */
  static async rejectInvite(userId: string, token: string) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new AppError('Invite expired, revoked, or invalid', 410, 'INVITE_EXPIRED_OR_REVOKED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.REJECTED },
    });

    eventEmitter.emit('team.invite_rejected', {
      invite,
      teamName: invite.team.name,
      userId,
      userName: user?.name || '',
      ownerId: invite.team.ownerId,
    });

    return { message: 'Invite declined successfully' };
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

  /**
   * Retrieves the detailed context of a team invitation by token.
   */
  static async getInviteDetails(token: string) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            owner: { select: { name: true } },
            members: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
            todos: {
              select: { id: true },
            },
            activityLogs: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        invitedByUser: { select: { name: true } },
      },
    });

    if (!invite) {
      throw new AppError('Invitation not found', 404, 'INVITE_NOT_FOUND');
    }

    return {
      id: invite.id,
      teamId: invite.teamId,
      teamName: invite.team.name,
      ownerName: invite.team.owner.name,
      description: invite.team.description,
      purpose: invite.team.purpose,
      invitedBy: invite.invitedByUser.name,
      members: invite.team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        role: m.role,
        avatarUrl: m.user.avatarUrl,
      })),
      tasksCount: invite.team.todos.length,
      recentActivity: invite.team.activityLogs.map((log) => ({
        id: log.id,
        action: log.action,
        userName: log.user.name,
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
      invitationDate: invite.createdAt,
      expiresAt: invite.expiresAt,
      status: invite.status,
    };
  }
}
