import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventEmitter';
import { broadcastToWorkspace } from './websocketService';
import { NotificationService } from './notificationService';
import { EmailService } from './emailService';

export class ChatService {
  /**
   * Fetches paginated chat history for a team workspace.
   */
  static async getChatHistory(userId: string, teamId: string, page = 1, limit = 50, search?: string) {
    // Verify membership
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    const skip = (page - 1) * limit;

    const where: any = { teamId };
    if (search) {
      where.message = { contains: search };
    }

    const [messages, totalCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.chatMessage.count({ where }),
    ]);

    return {
      messages,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Posts a new chat message to a team workspace.
   */
  static async postMessage(userId: string, teamId: string, messageText: string, metadata?: any) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    const membership = team.members.find((m) => m.userId === userId);
    if (!membership) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    // Save message to database
    const chatMsg = await prisma.chatMessage.create({
      data: {
        teamId,
        userId,
        message: messageText,
        metadata: metadata || {},
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Mark comments/chat as read for the sender
    await prisma.teamMember.update({
      where: { id: membership.id },
      data: { lastReadChatTime: new Date() },
    });

    // Parse @mentions
    const sender = chatMsg.user;
    const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
    const matches = [...messageText.matchAll(mentionRegex)];
    const mentionedNames = new Set(matches.map((m) => m[1].toLowerCase()));
    
    const notificationsToSend: Promise<any>[] = [];

    // Notify other team members
    for (const member of team.members) {
      if (member.userId === userId) continue;

      const memberName = member.user.name.toLowerCase().replace(/\s+/g, '');
      const isMentioned = mentionedNames.has(memberName) || mentionedNames.has(member.user.email.split('@')[0].toLowerCase());

      if (isMentioned) {
        // Send mention notification
        notificationsToSend.push(
          NotificationService.createNotification({
            userId: member.userId,
            title: `Mentioned in ${team.name} chat`,
            message: `${sender.name} mentioned you: "${messageText.substring(0, 60)}${messageText.length > 60 ? '...' : ''}"`,
            type: 'CHAT_MENTION',
            metadata: JSON.stringify({ teamId, messageId: chatMsg.id }),
          })
        );
        // Enqueue email
        notificationsToSend.push(
          EmailService.enqueueWorkspaceAnnouncementEmail
            ? EmailService.enqueueWorkspaceAnnouncementEmail(member.user.email, team.name, `${sender.name} mentioned you in chat: "${messageText}"`)
            : Promise.resolve()
        );
      }
    }

    await Promise.all(notificationsToSend);

    // Broadcast Chat Message to Workspace WebSocket clients
    broadcastToWorkspace(teamId, {
      eventType: 'CHAT_MESSAGE_CREATED',
      workspaceId: teamId,
      userId,
      timestamp: new Date().toISOString(),
      payload: chatMsg,
    });

    return chatMsg;
  }

  /**
   * Updates lastReadChatTime for a team workspace member.
   */
  static async markChatAsRead(userId: string, teamId: string) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
    }

    await prisma.teamMember.update({
      where: { id: membership.id },
      data: { lastReadChatTime: new Date() },
    });

    return { success: true };
  }

  /**
   * Gets unread chat counts for all workspaces of a user.
   */
  static async getUnreadCounts(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: {
        teamId: true,
        lastReadChatTime: true,
      },
    });

    const unreadCounts = await Promise.all(
      memberships.map(async (m) => {
        const count = await prisma.chatMessage.count({
          where: {
            teamId: m.teamId,
            createdAt: { gt: m.lastReadChatTime },
          },
        });
        return { teamId: m.teamId, count };
      })
    );

    return unreadCounts;
  }
}
