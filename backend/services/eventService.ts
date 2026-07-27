import { EventEmitter } from 'events';
import prisma from '../database/client';
import { NotificationService } from './notificationService';
import { ActivityService } from './activityService';
import { logger } from '../middleware/logging';

export const eventEmitter = new EventEmitter();

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
if (!(global as any).__event_listeners_registered__) {
  (global as any).__event_listeners_registered__ = true;
  logger.info('Registering centralized event handlers (once)...');

  // 1. Task Created
  eventEmitter.on('task.created', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      
      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TODO_CREATE',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      // Create notifications if team todo
      if (todo.teamId) {
        const teamName = await getTeamName(todo.teamId);
        await notifyTeamMembers(
          todo.teamId,
          actingUserId,
          'New Shared Task',
          `${userName} created task "${todo.title}" in team "${teamName}"`,
          'TODO_CREATED'
        );
      }
    } catch (error) {
      logger.error('Error in task.created listener:', error);
    }
  });

  // 2. Task Completed
  eventEmitter.on('todo.completed', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);

      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_COMPLETED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      // Create notifications if team todo
      if (todo.teamId) {
        const teamName = await getTeamName(todo.teamId);
        await notifyTeamMembers(
          todo.teamId,
          actingUserId,
          'Shared Task Completed',
          `${userName} completed task "${todo.title}" in team "${teamName}"`,
          'TODO_COMPLETED'
        );
      }
    } catch (error) {
      logger.error('Error in todo.completed listener:', error);
    }
  });

  // 3. Task Assigned
  eventEmitter.on('todo.assigned', async ({ todo, assigneeId, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
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
    } catch (error) {
      logger.error('Error in todo.assigned listener:', error);
    }
  });

  // 4. Task Unassigned
  eventEmitter.on('todo.unassigned', async ({ todo, oldAssigneeId, actingUserId }) => {
    try {
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // Notify former Assignee of unassignment
      if (oldAssigneeId) {
        await NotificationService.createNotification({
          userId: oldAssigneeId,
          title: 'Task Unassigned',
          message: `You have been unassigned from task "${todo.title}" in team "${teamName}".`,
          type: 'TASK_UNASSIGNED',
          metadata: todo.teamId || undefined,
        });
      }
    } catch (error) {
      logger.error('Error in todo.unassigned listener:', error);
    }
  });

  // 5. Task Started (TODO -> IN_PROGRESS)
  eventEmitter.on('task.started', async ({ todo, actingUserId }) => {
    try {
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_STARTED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });
    } catch (error) {
      logger.error('Error in task.started listener:', error);
    }
  });

  // 6. Task Submitted For Review
  eventEmitter.on('task.submitted_for_review', async ({ todo, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = todo.teamId ? await getTeamName(todo.teamId) : 'a team';

      // 1. Create activity log: TASK_SUBMITTED_FOR_REVIEW
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_SUBMITTED_FOR_REVIEW',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      // 2. Notify team owner & admins
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

      // 1. Create activity log: REVIEW_APPROVED and TASK_COMPLETED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'REVIEW_APPROVED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TASK_COMPLETED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

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

      // 1. Create activity log: REVIEW_REJECTED
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'REVIEW_REJECTED',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });

      // 2. Notify Assignee
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
      // 1. Create activity log: COMMENT_ADDED
      await ActivityService.createActivityEvent({
        teamId,
        userId: actingUserId,
        action: 'COMMENT_ADDED',
        entityType: 'Todo',
        entityId: comment.taskId,
        metadata: { title: taskTitle, teamId },
      });
    } catch (error) {
      logger.error('Error in task.comment_added listener:', error);
    }
  });

  // 10. Task Attachment Uploaded
  eventEmitter.on('task.attachment_uploaded', async ({ attachment, taskTitle, teamId, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);
      const teamName = teamId ? await getTeamName(teamId) : 'a team';

      // 1. Create activity log: ATTACHMENT_UPLOADED
      await ActivityService.createActivityEvent({
        teamId,
        userId: actingUserId,
        action: 'ATTACHMENT_UPLOADED',
        entityType: 'Todo',
        entityId: attachment.taskId,
        metadata: { title: taskTitle, fileName: attachment.fileName, teamId },
      });

      // 2. Notify other team members (optional notification as per spec)
      if (teamId) {
        await notifyTeamMembers(
          teamId,
          actingUserId,
          'Attachment Uploaded',
          `${userName} uploaded "${attachment.fileName}" for task "${taskTitle}"`,
          'ATTACHMENT_UPLOADED'
        );
      }
    } catch (error) {
      logger.error('Error in task.attachment_uploaded listener:', error);
    }
  });

  // 11. Task Deleted
  eventEmitter.on('todo.deleted', async ({ todo, actingUserId }) => {
    try {
      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: todo.teamId,
        userId: actingUserId,
        action: 'TODO_DELETE',
        entityType: 'Todo',
        entityId: todo.id,
        metadata: { title: todo.title, teamId: todo.teamId },
      });
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
      const userName = await getUserName(actingUserId);

      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: team.id,
        userId: actingUserId,
        action: 'TEAM_UPDATED',
        entityType: 'Team',
        entityId: team.id,
        metadata: { oldName, newName: team.name },
      });

      // Notify other members
      await notifyTeamMembers(
        team.id,
        actingUserId,
        'Team Renamed',
        `${userName} renamed the team to "${team.name}"`,
        'TEAM_RENAMED'
      );
    } catch (error) {
      logger.error('Error in team.renamed listener:', error);
    }
  });

  // 14. Team Deleted
  eventEmitter.on('team.deleted', async ({ teamId, teamName, members, actingUserId }) => {
    try {
      const userName = await getUserName(actingUserId);

      // Create activity log
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
              title: 'Team Deleted',
              message: `${userName} deleted the team "${teamName}"`,
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

      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: invite.teamId,
        userId: actingUserId,
        action: 'INVITE_SENT',
        entityType: 'TeamInvite',
        entityId: invite.id,
        metadata: { email: invite.email, teamName },
      });

      // Check if invitee exists in database
      const invitee = await prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (invitee) {
        await NotificationService.createNotification({
          userId: invitee.id,
          title: 'Team Invitation',
          message: `${userName} invited you to join team "${teamName}"`,
          type: 'TEAM_INVITE_RECEIVED',
          metadata: invite.token,
        });
      }
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

      // 2. Create activity log: TEAM_MEMBER_JOINED
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
        title: 'Joined Team',
        message: `You joined "${teamName}".`,
        type: 'TEAM_MEMBER_JOINED',
      });

      // Notify other team members
      await notifyTeamMembers(
        invite.teamId,
        userId,
        'New Member Joined',
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

      // Create activity log
      await ActivityService.createActivityEvent({
        teamId: teamId,
        userId: actingUserId,
        action: 'TEAM_REMOVE_MEMBER',
        entityType: 'TeamMember',
        entityId: targetUserId,
        metadata: { targetName, teamName },
      });

      // Notify target user
      await NotificationService.createNotification({
        userId: targetUserId,
        title: 'Removed from Team',
        message: `${userName} removed you from team "${teamName}"`,
        type: 'TEAM_MEMBER_REMOVED',
      });

      // Notify other members
      await notifyTeamMembers(
        teamId,
        actingUserId,
        'Member Removed',
        `${userName} removed ${targetName} from team "${teamName}"`,
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

        // Create activity log
        await ActivityService.createActivityEvent({
          teamId: teamId,
          userId: actingUserId,
          action: 'TEAM_CHANGE_ROLE',
          entityType: 'TeamMember',
          entityId: targetUserId,
          metadata: { targetName, oldRole, newRole, teamName },
        });

        // Notify target user
        await NotificationService.createNotification({
          userId: targetUserId,
          title: 'Team Role Updated',
          message: `${userName} changed your role in team "${teamName}" to ${newRole}`,
          type: 'TEAM_ROLE_UPDATED',
        });
      } catch (error) {
        logger.error('Error in team.role_updated listener:', error);
      }
    }
  );
}
