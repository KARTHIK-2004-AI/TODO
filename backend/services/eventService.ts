import { EventEmitter } from 'events';
import prisma from '../database/client';
import { NotificationService } from './notificationService';
import { ActivityService } from './activityService';
import { logger } from '../middleware/logging';
import { eventEmitter } from './eventEmitter';
import { broadcastToWorkspace, sendToUser } from './websocketService';
import { EmailService } from './emailService';

// Helper to fetch user name
async function getUserName(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || 'Someone';
  } catch (error) {
    logger.error('Error fetching user name in event handler:', error);
    return 'Someone';
  }
}

// Helper to fetch team name
async function getTeamName(teamId: string): Promise<string> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });
    return team?.name || 'a team';
  } catch (error) {
    logger.error('Error fetching team name in event handler:', error);
    return 'a team';
  }
}

// Helper to notify other members of a team
async function notifyTeamMembers(
  teamId: string,
  excludeUserId: string,
  title: string,
  message: string,
  type: string
) {
  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId, NOT: { userId: excludeUserId } },
      select: { userId: true },
    });

    await Promise.all(
      members.map((member) =>
        NotificationService.createNotification({
          userId: member.userId,
          title,
          message,
          type,
        }).catch((err) => {
          logger.error(`Failed to create notification for user ${member.userId}:`, err);
        })
      )
    );
  } catch (error) {
    logger.error('Error notifying team members in event handler:', error);
  }
}

// ----------------------------------------------------
// Global Guard to Prevent Duplicate Listener Registration
// ----------------------------------------------------
// Helper to parse and find mentioned user IDs in team chat or comments
async function getMentionedUserIds(text: string, teamId?: string | null): Promise<string[]> {
  const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  if (matches.length === 0) return [];
  const names = matches.map((m) => m[1].toLowerCase());

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { in: names } },
        { email: { startsWith: '' } }, // Fetch to filter by prefix in memory
      ],
    },
    select: { id: true, name: true, email: true },
  });

  const mentionedIds: string[] = [];
  for (const user of users) {
    const formattedName = user.name.toLowerCase().replace(/\s+/g, '');
    const emailPrefix = user.email.split('@')[0].toLowerCase();
    if (names.includes(formattedName) || names.includes(emailPrefix)) {
      if (teamId) {
        const isMember = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId: user.id } },
        });
        if (isMember) mentionedIds.push(user.id);
      } else {
        mentionedIds.push(user.id);
      }
    }
  }
  return mentionedIds;
}

// ----------------------------------------------------
// Global Guard to Prevent Duplicate Listener Registration
// ----------------------------------------------------
if (!(global as any).__event_listeners_registered__) {
  (global as any).__event_listeners_registered__ = true;
  logger.info('Registering centralized event handlers (once)...');

  // 1. Task Created
  eventEmitter.on('task.created', async ({ todo, actingUserId }) => {
    try {
      // Feature 1: Task creation is NOT in the allowed ActivityLog (smart timeline) list.
      // Everything else should remain inside task history.
      
      // Feature 2: Do NOT notify on task creation itself. Only notify if assigned.
    } catch (error) {
      logger.error('Error in task.created listener:', error);
    }
  });

  // 2. Task Completed
  eventEmitter.on('todo.completed', async ({ todo, actingUserId }) => {
    try {
      // Create activity log: TASK_COMPLETED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_COMPLETED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      // Feature 2: Completion does not trigger direct workspace-wide notification spam.
    } catch (error) {
      logger.error('Error in todo.completed listener:', error);
    }
  });

  // 3. Task Assigned
  eventEmitter.on('todo.assigned', async ({ todo, assigneeId, actingUserId }) => {
    try {
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // 1. Create activity log: TASK_ASSIGNED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_ASSIGNED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, assigneeId, teamName },
      });

      // 2. Notify Assignee
      await NotificationService.createNotification({
        userId: assigneeId,
        title: 'Task Assigned',
        message: `You have been assigned task "${todo.title}" in team "${teamName}".`,
        type: 'TASK_ASSIGNED',
        metadata: todo.teamId || undefined,
      });

      // 3. Enqueue Email for assignment
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assignee) {
        await EmailService.enqueueDueReminder(assignee.email, assignee.name, todo.title, todo.dueDate || new Date());
      }
    } catch (error) {
      logger.error('Error in todo.assigned listener:', error);
    }
  });

  // 4. Task Unassigned
  eventEmitter.on('todo.unassigned', async ({ todo, oldAssigneeId, actingUserId }) => {
    try {
      // Feature 2: No activity log or notification spam for unassignment.
    } catch (error) {
      logger.error('Error in todo.unassigned listener:', error);
    }
  });

  // 5. Task Started (TODO -> IN_PROGRESS)
  eventEmitter.on('task.started', async ({ todo, actingUserId }) => {
    try {
      // Feature 1: Task starting is NOT in the allowed ActivityLog (smart timeline) list.
    } catch (error) {
      logger.error('Error in task.started listener:', error);
    }
  });

  // 6. Task Submitted For Review
  eventEmitter.on('task.submitted_for_review', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // Feature 1: Task review is NOT in the allowed ActivityLog (smart timeline) list.

      // 2. Notify team owner & admins (attention needed)
      if (todo.teamId) {
        const ownersAndAdmins = await prisma.teamMember.findMany({
          where: {
            teamId: todo.teamId,
            role: { in: ['OWNER', 'ADMIN'] },
            NOT: { userId: actingUserId },
          },
          select: { userId: true },
        });

        await Promise.all(
          ownersAndAdmins.map((member) =>
            NotificationService.createNotification({
              userId: member.userId,
              title: 'Task Review Requested',
              message: `${userName} submitted task "${todo.title}" for review in team "${teamName}"`,
              type: 'TASK_SUBMITTED_FOR_REVIEW',
              metadata: todo.teamId || undefined,
            }).catch(() => {})
          )
        );
      }
    } catch (error) {
      logger.error('Error in task.submitted_for_review listener:', error);
    }
  });

  // 7. Review Approved (IN_REVIEW -> DONE)
  eventEmitter.on('task.review_approved', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // Feature 1: Do not log duplicate REVIEW_APPROVED, only TASK_COMPLETED.

      // 2. Notify Assignee
      if (todo.assignedToUserId && todo.assignedToUserId !== actingUserId) {
        await NotificationService.createNotification({
          userId: todo.assignedToUserId,
          title: 'Task Review Approved',
          message: `${userName} approved your task "${todo.title}" in team "${teamName}".`,
          type: 'REVIEW_APPROVED',
          metadata: todo.teamId || undefined,
        });
      }
    } catch (error) {
      logger.error('Error in task.review_approved listener:', error);
    }
  });

  // 8. Review Rejected (IN_REVIEW -> IN_PROGRESS)
  eventEmitter.on('task.review_rejected', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // Feature 2: Notify Assignee (needs attention)
      if (todo.assignedToUserId && todo.assignedToUserId !== actingUserId) {
        await NotificationService.createNotification({
          userId: todo.assignedToUserId,
          title: 'Task Review Rejected',
          message: `${userName} sent back your task "${todo.title}" to In Progress in team "${teamName}".`,
          type: 'REVIEW_REJECTED',
          metadata: todo.teamId || undefined,
        });
      }
    } catch (error) {
      logger.error('Error in task.review_rejected listener:', error);
    }
  });

  // 9. Task Comment Added
  eventEmitter.on('task.comment_added', async ({ comment, taskTitle, teamId, actingUserId }) => {
    try {
      // Feature 1: Comment addition is NOT logged in ActivityLog (smart timeline).

      // Feature 2: Notify assignee/creator (Comment on my task) and parse @mentions
      const todo = await prisma.todo.findUnique({ where: { id: comment.taskId } });
      if (!todo) return;

      const notifyUsers = new Set<string>();
      
      // 1. Comment on my task (assignee / creator)
      if (todo.assignedToUserId && todo.assignedToUserId !== actingUserId) {
        notifyUsers.add(todo.assignedToUserId);
      }
      if (todo.userId !== actingUserId) {
        notifyUsers.add(todo.userId);
      }

      // 2. Parse @mentions
      const mentionedUserIds = await getMentionedUserIds(comment.message, teamId);
      for (const uid of mentionedUserIds) {
        if (uid !== actingUserId) notifyUsers.add(uid);
      }

      const userName = await getUserName(actingUserId);

      await Promise.all(
        Array.from(notifyUsers).map(async (uid) => {
          const isMention = mentionedUserIds.includes(uid);
          const title = isMention ? 'Mentioned in Comment' : 'New Comment on Task';
          const msg = isMention 
            ? `${userName} mentioned you in a comment on task "${taskTitle}"`
            : `${userName} commented on your task "${taskTitle}"`;
          
          await NotificationService.createNotification({
            userId: uid,
            title,
            message: msg,
            type: isMention ? 'COMMENT_MENTION' : 'TASK_COMMENT_NOTIFICATION',
            metadata: todo.id,
          });
        })
      );
    } catch (error) {
      logger.error('Error in task.comment_added listener:', error);
    }
  });

  // 10. Task Attachment Uploaded
  eventEmitter.on('task.attachment_uploaded', async ({ attachment, taskTitle, teamId, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = teamId ? await getTeamName(teamId) : 'a team';

      // Feature 1: ONLY create activity log if marked important!
      if (attachment.isImportant) {
        await ActivityService.createActivityEvent({
          teamId,
          userId: actingUserId,
          action: 'IMPORTANT_FILE_UPLOADED',
          entityType: 'Todo',
          entityId: attachment.taskId,
          metadata: { title: taskTitle, fileName: attachment.fileName, teamId },
        });
      }

      // Feature 2: Notify assignee/creator (File shared with me)
      const todo = await prisma.todo.findUnique({ where: { id: attachment.taskId } });
      if (todo) {
        const notifyUsers = new Set<string>();
        if (todo.assignedToUserId && todo.assignedToUserId !== actingUserId) {
          notifyUsers.add(todo.assignedToUserId);
        }
        if (todo.userId !== actingUserId) {
          notifyUsers.add(todo.userId);
        }

        await Promise.all(
          Array.from(notifyUsers).map((uid) =>
            NotificationService.createNotification({
              userId: uid,
              title: 'File Shared With You',
              message: `${userName} uploaded file "${attachment.fileName}" for task "${taskTitle}"`,
              type: 'FILE_SHARED',
              metadata: todo.id,
            }).catch(() => {})
          )
        );
      }
    } catch (error) {
      logger.error('Error in task.attachment_uploaded listener:', error);
    }
  });

  // 11. Task Deleted
  eventEmitter.on('todo.deleted', async ({ todo, actingUserId }) => {
    try {
      // Feature 1: Todo delete is NOT logged to ActivityLog.
    } catch (error) {
      logger.error('Error in todo.deleted listener:', error);
    }
  });

  // 12. Team Created
  eventEmitter.on('team.created', async ({ team, actingUserId }) => {
    try {
      await ActivityService.createActivityEvent({
        teamId: team.id,
        userId: actingUserId,
        action: 'TEAM_CREATED',
        entityType: 'Team',
        entityId: team.id,
        metadata: { name: team.name },
      });
    } catch (error) {
      logger.error('Error in team.created listener:', error);
    }
  });

  // 13. Team Renamed
  eventEmitter.on('team.renamed', async ({ team, oldName, actingUserId }) => {
    try {
      // Feature 1: No timeline spam for simple team renaming.
    } catch (error) {
      logger.error('Error in team.renamed listener:', error);
    }
  });

  // 14. Team Deleted
  eventEmitter.on('team.deleted', async ({ teamId, teamName, members, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);

      // Create activity log: TEAM_DELETED (Workspace deleted)
      await ActivityService.createActivityEvent({
        teamId: null,
        userId: actingUserId,
        action: 'TEAM_DELETED',
        entityType: 'Team',
        entityId: teamId,
        metadata: { name: teamName },
      });

      // Notify former members
      await Promise.all(
        members
          .filter((memberId: string) => memberId !== actingUserId)
          .map((memberId: string) =>
            NotificationService.createNotification({
              userId: memberId,
              title: 'Team Workspace Deleted',
              message: `${userName} deleted the team workspace "${teamName}"`,
              type: 'TEAM_DELETED',
            }).catch((err) => {
              logger.error(`Failed to notify former member ${memberId} of deleted team ${teamName}:`, err);
            })
          )
      );
    } catch (error) {
      logger.error('Error in team.deleted listener:', error);
    }
  });

  // 15. Member Invited
  eventEmitter.on('team.invited', async ({ invite, teamName, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);

      // Feature 1: Invitation sent is NOT logged to timeline.

      // Check if invitee exists in database
      const invitee = await prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (invitee) {
        await NotificationService.createNotification({
          userId: invitee.id,
          title: 'Team Invitation Received',
          message: `${userName} invited you to join team "${teamName}"`,
          type: 'TEAM_INVITE_RECEIVED',
          metadata: invite.token,
        });
      }

      // Enqueue Invitation Email (branded)
      await EmailService.enqueueInvitation(invite.email, userName, teamName, invite.token);
    } catch (error) {
      logger.error('Error in team.invited listener:', error);
    }
  });

  // 16. Invite Accepted
  eventEmitter.on('team.invite_accepted', async ({ invite, teamName, userId, userName, memberId, ownerId }) => {
    try {
      // 1. Create activity log: INVITE_ACCEPTED
      await ActivityService.createActivityEvent({
        teamId: invite.teamId,
        userId: userId,
        action: 'INVITE_ACCEPTED',
        entityType: 'TeamInvite',
        entityId: invite.id,
        metadata: { teamName, email: invite.email },
      });

      // 2. Create activity log: TEAM_MEMBER_JOINED (Member joined)
      await ActivityService.createActivityEvent({
        teamId: invite.teamId,
        userId: userId,
        action: 'TEAM_MEMBER_JOINED',
        entityType: 'TeamMember',
        entityId: memberId,
        metadata: { teamName },
      });

      // 3. Notify Owner
      await NotificationService.createNotification({
        userId: ownerId,
        title: 'Invitation Accepted',
        message: `${userName} accepted your invitation to join team "${teamName}".`,
        type: 'TEAM_INVITE_ACCEPTED',
      });

      // 4. Notify Recipient
      await NotificationService.createNotification({
        userId: userId,
        title: 'Joined Team Workspace',
        message: `You successfully joined "${teamName}".`,
        type: 'TEAM_MEMBER_JOINED',
      });

      // Notify other team members (Workspace Announcement style)
      await notifyTeamMembers(
        invite.teamId,
        userId,
        'New Member Joined Workspace',
        `${userName} joined the team "${teamName}"`,
        'TEAM_INVITE_ACCEPTED'
      );
    } catch (error) {
      logger.error('Error in team.invite_accepted listener:', error);
    }
  });

  // 17. Invite Rejected
  eventEmitter.on('team.invite_rejected', async ({ invite, teamName, userId, userName, ownerId }) => {
    try {
      // 1. Create activity log: INVITE_REJECTED
      await ActivityService.createActivityEvent({
        teamId: invite.teamId,
        userId: userId,
        action: 'INVITE_REJECTED',
        entityType: 'TeamInvite',
        entityId: invite.id,
        metadata: { teamName, email: invite.email },
      });

      // 2. Notify Owner
      await NotificationService.createNotification({
        userId: ownerId,
        title: 'Invitation Declined',
        message: `${userName} declined your invitation to join team "${teamName}".`,
        type: 'TEAM_INVITE_DECLINED',
      });
    } catch (error) {
      logger.error('Error in team.invite_rejected listener:', error);
    }
  });

  // 18. Member Removed
  eventEmitter.on('team.member_removed', async ({ teamId, teamName, targetUserId, targetName, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);

      // Create activity log: TEAM_MEMBER_LEFT (Member left)
      await ActivityService.createActivityEvent({
        teamId: teamId,
        userId: targetUserId,
        action: 'TEAM_MEMBER_LEFT',
        entityType: 'TeamMember',
        entityId: targetUserId,
        metadata: { targetName, teamName },
      });

      // Notify target user
      await NotificationService.createNotification({
        userId: targetUserId,
        title: 'Removed from Team Workspace',
        message: `${userName} removed you from team "${teamName}"`,
        type: 'TEAM_MEMBER_REMOVED',
      });

      // Notify other members
      await notifyTeamMembers(
        teamId,
        actingUserId,
        'Member Left Workspace',
        `${targetName} has left the team "${teamName}"`,
        'TEAM_MEMBER_REMOVED'
      );
    } catch (error) {
      logger.error('Error in team.member_removed listener:', error);
    }
  });

  // 19. Role Updated
  eventEmitter.on(
    'team.role_updated',
    async ({ teamId, teamName, targetUserId, targetName, oldRole, newRole, actingUserId }) => {
      try {
        const userName = await getUserName(actingUserId);
        
        // Feature 1: Role change is NOT in allowed ActivityLog (smart timeline) list.

        // Feature 2: Notify target user
        await NotificationService.createNotification({
          userId: targetUserId,
          title: 'Team Role Updated',
          message: `${userName} changed your role in team "${teamName}" to ${newRole}`,
          type: 'TEAM_ROLE_UPDATED',
        });

        // Enqueue branded role promotion email
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (targetUser) {
          await EmailService.enqueueRolePromotion(targetUser.email, targetUser.name, teamName, newRole);
        }
      } catch (error) {
        logger.error('Error in team.role_updated listener:', error);
      }
    }
  );

  // 20. Due Date Changed
  eventEmitter.on('todo.due_date_changed', async ({ todo, oldDueDate, newDueDate, actingUserId }) => {
    try {
      // Create activity log: DUE_DATE_CHANGED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'DUE_DATE_CHANGED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { 
          title: todo.title, 
          oldDueDate: oldDueDate ? new Date(oldDueDate).toISOString() : null, 
          newDueDate: newDueDate ? new Date(newDueDate).toISOString() : null, 
          teamId: todo.teamId 
        },
      });

      // Notify assignee if someone else changed it
      if (todo.assignedToUserId && todo.assignedToUserId !== actingUserId) {
        await NotificationService.createNotification({
          userId: todo.assignedToUserId,
          title: 'Task Due Date Changed',
          message: `The due date for task "${todo.title}" has been updated.`,
          type: 'DUE_DATE_CHANGED',
          metadata: todo.id,
        });
      }
    } catch (error) {
      logger.error('Error in todo.due_date_changed listener:', error);
    }
  });

  // 21. Task Archived
  eventEmitter.on('todo.archived', async ({ todo, actingUserId }) => {
    try {
      // Create activity log: TASK_ARCHIVED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_ARCHIVED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });
    } catch (error) {
      logger.error('Error in todo.archived listener:', error);
    }
  });


  // 20. WebSocket real-time event routing
  eventEmitter.on('task.created', ({ todo, actingUserId }) => {
    broadcastToWorkspace(todo.teamId || 'private', {
      eventType: 'TASK_CREATED',
      workspaceId: todo.teamId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: todo,
    });
  });

  eventEmitter.on('todo.updated', ({ todo, actingUserId }) => {
    broadcastToWorkspace(todo.teamId || 'private', {
      eventType: 'TASK_UPDATED',
      workspaceId: todo.teamId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: todo,
    });
  });

  eventEmitter.on('todo.deleted', ({ todo, actingUserId }) => {
    broadcastToWorkspace(todo.teamId || 'private', {
      eventType: 'TASK_DELETED',
      workspaceId: todo.teamId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: { id: todo.id },
    });
  });

  eventEmitter.on('task.comment_added', ({ comment, teamId, actingUserId }) => {
    broadcastToWorkspace(teamId || 'private', {
      eventType: 'COMMENT_CREATED',
      workspaceId: teamId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: comment,
    });
  });

  eventEmitter.on('task.comment_updated', ({ comment, workspaceId, actingUserId }) => {
    broadcastToWorkspace(workspaceId || 'private', {
      eventType: 'COMMENT_UPDATED',
      workspaceId: workspaceId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: comment,
    });
  });

  eventEmitter.on('task.comment_deleted', ({ commentId, taskId, workspaceId, actingUserId }) => {
    broadcastToWorkspace(workspaceId || 'private', {
      eventType: 'COMMENT_DELETED',
      workspaceId: workspaceId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: { id: commentId, taskId },
    });
  });

  eventEmitter.on('task.attachment_uploaded', ({ attachment, teamId, actingUserId }) => {
    broadcastToWorkspace(teamId || 'private', {
      eventType: 'ATTACHMENT_UPLOADED',
      workspaceId: teamId || 'private',
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: attachment,
    });
  });

  eventEmitter.on('notification.created', ({ notification }) => {
    sendToUser(notification.userId, {
      eventType: 'NOTIFICATION_CREATED',
      workspaceId: null,
      userId: notification.userId,
      timestamp: new Date().toISOString(),
      payload: notification,
    });
  });

  eventEmitter.on('activity.created', ({ log }) => {
    const wsId = log.teamId || 'private';
    broadcastToWorkspace(wsId, {
      eventType: 'TIMELINE_UPDATED',
      workspaceId: wsId,
      userId: log.userId,
      timestamp: new Date().toISOString(),
      payload: log,
    });
    if (!log.teamId) {
      sendToUser(log.userId, {
        eventType: 'TIMELINE_UPDATED',
        workspaceId: 'private',
        userId: log.userId,
        timestamp: new Date().toISOString(),
        payload: log,
      });
    }
  });

  eventEmitter.on('team.invite_accepted', ({ invite, userId, userName, memberId }) => {
    broadcastToWorkspace(invite.teamId, {
      eventType: 'MEMBER_JOINED',
      workspaceId: invite.teamId,
      userId: userId,
      timestamp: new Date().toISOString(),
      payload: { userId, userName, memberId, role: 'MEMBER' },
    });
    broadcastToWorkspace(invite.teamId, {
      eventType: 'WORKSPACE_UPDATED',
      workspaceId: invite.teamId,
      userId: userId,
      timestamp: new Date().toISOString(),
      payload: { teamId: invite.teamId },
    });
  });

  eventEmitter.on('team.member_removed', ({ teamId, targetUserId, targetName }) => {
    broadcastToWorkspace(teamId, {
      eventType: 'MEMBER_LEFT',
      workspaceId: teamId,
      userId: targetUserId,
      timestamp: new Date().toISOString(),
      payload: { userId: targetUserId, userName: targetName },
    });
    broadcastToWorkspace(teamId, {
      eventType: 'WORKSPACE_UPDATED',
      workspaceId: teamId,
      userId: targetUserId,
      timestamp: new Date().toISOString(),
      payload: { teamId },
    });
  });

  eventEmitter.on('team.renamed', ({ team, actingUserId }) => {
    broadcastToWorkspace(team.id, {
      eventType: 'WORKSPACE_UPDATED',
      workspaceId: team.id,
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: { teamId: team.id, name: team.name },
    });
  });

  eventEmitter.on('team.deleted', ({ teamId, actingUserId }) => {
    broadcastToWorkspace(teamId, {
      eventType: 'WORKSPACE_UPDATED',
      workspaceId: teamId,
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: { teamId, deleted: true },
    });
  });

  eventEmitter.on('team.role_updated', ({ teamId, targetUserId, actingUserId }) => {
    broadcastToWorkspace(teamId, {
      eventType: 'WORKSPACE_UPDATED',
      workspaceId: teamId,
      userId: actingUserId,
      timestamp: new Date().toISOString(),
      payload: { teamId, targetUserId },
    });
  });

  eventEmitter.on('task.comments_read', ({ taskId, userId, userName, commentIds, teamId }) => {
    broadcastToWorkspace(teamId || 'private', {
      eventType: 'COMMENT_READ',
      workspaceId: teamId || 'private',
      userId,
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        userId,
        userName,
        viewedAt: new Date().toISOString(),
        commentIds,
      },
    });
  });
}
