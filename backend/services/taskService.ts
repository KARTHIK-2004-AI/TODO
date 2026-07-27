import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventService';
import { TaskPriority, TaskStatus, Role } from '../prisma/client';

export interface TaskFilterOptions {
  completed?: boolean;
  search?: string;
  teamId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string;
}

export class TaskService {
  // Helper to log audit history in the database
  static async logHistory(taskId: string, userId: string, action: string, prevValue?: string | null, newValue?: string | null) {
    return prisma.taskHistory.create({
      data: {
        taskId,
        performedBy: userId,
        action,
        previousValue: prevValue ?? null,
        newValue: newValue ?? null,
      },
    });
  }

  // Get user role on team
  static async getMemberRole(teamId: string, userId: string): Promise<Role | null> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    return member?.role ?? null;
  }

  static async getTodos(userId: string, options: TaskFilterOptions) {
    const whereClause: any = {};

    if (options.teamId) {
      // Shared team todos - verify membership
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: options.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }

      whereClause.teamId = options.teamId;
    } else {
      // Private todos (default) - teamId must be null and owned by current user
      whereClause.userId = userId;
      whereClause.teamId = null;
    }

    if (options.completed !== undefined) {
      whereClause.completed = options.completed;
    }

    if (options.priority) {
      whereClause.priority = options.priority;
    }

    if (options.status) {
      whereClause.status = options.status;
    }

    if (options.assigneeId) {
      whereClause.assignedToUserId = options.assigneeId;
    }

    if (options.search) {
      whereClause.OR = [
        { title: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }

    return prisma.todo.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getTodoById(userId: string, todoId: string) {
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      include: {
        assignedToUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } }
          }
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: { select: { id: true, name: true, email: true } }
          }
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        }
      }
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
    }

    if (todo.teamId) {
      // Verify team membership
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }
    } else {
      // Private todo - verify ownership
      if (todo.userId !== userId) {
        throw new AppError('Todo not found', 404);
      }
    }

    // Resolve performer details for the history log output
    const performerIds = todo.histories.map((h) => h.performedBy);
    const users = await prisma.user.findMany({
      where: { id: { in: performerIds } },
      select: { id: true, name: true, email: true, avatarUrl: true }
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const historiesWithPerformer = todo.histories.map((h) => ({
      ...h,
      performer: usersMap.get(h.performedBy) || { id: h.performedBy, name: 'System', email: '', avatarUrl: '' }
    }));

    return {
      ...todo,
      histories: historiesWithPerformer,
    };
  }

  static async createTodo(
    userId: string,
    data: {
      title: string;
      description?: string;
      teamId?: string;
      assignedToUserId?: string | null;
      assignedUserId?: string | null; // Compatibility field
      priority?: TaskPriority;
      status?: TaskStatus;
      dueDate?: Date | string | null;
      startDate?: Date | string | null;
      estimatedHours?: number | null;
    }
  ) {
    const assignedUserId = data.assignedToUserId !== undefined ? data.assignedToUserId : data.assignedUserId;

    if (data.startDate && data.dueDate && new Date(data.dueDate) <= new Date(data.startDate)) {
      throw new AppError('Due date must be after start date', 400, 'INVALID_DUE_DATE');
    }

    if (data.teamId) {
      // Verify membership before creating team todo
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: data.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }

      if (assignedUserId) {
        // Verify assignee is a member of the team
        const assigneeMembership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: data.teamId, userId: assignedUserId } },
        });
        if (!assigneeMembership) {
          throw new AppError('Assignee is not a member of this team', 400, 'ASSIGNEE_NOT_TEAM_MEMBER');
        }
      }
    } else if (assignedUserId) {
      throw new AppError('Cannot assign personal tasks', 400, 'CANNOT_ASSIGN_PERSONAL_TASK');
    }

    const initialStatus = data.status ?? TaskStatus.TODO;
    const isCompleted = initialStatus === TaskStatus.DONE;

    const todo = await prisma.todo.create({
      data: {
        title: data.title,
        description: data.description ?? '',
        userId,
        teamId: data.teamId ?? null,
        assignedToUserId: assignedUserId ?? null,
        priority: data.priority ?? TaskPriority.MEDIUM,
        status: initialStatus,
        completed: isCompleted,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        estimatedHours: data.estimatedHours ?? null,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Audit logs
    await this.logHistory(todo.id, userId, 'TASK_CREATED', null, todo.title);

    if (todo.assignedToUserId) {
      await this.logHistory(todo.id, userId, 'TASK_ASSIGNED', null, todo.assignedToUserId);
    }

    // Trigger events
    eventEmitter.emit('task.created', { todo, actingUserId: userId });

    if (todo.assignedToUserId) {
      eventEmitter.emit('todo.assigned', { todo, assigneeId: todo.assignedToUserId, actingUserId: userId });
    }

    return todo;
  }

  static async updateTodo(
    userId: string,
    todoId: string,
    data: {
      title?: string;
      description?: string;
      completed?: boolean;
      assignedToUserId?: string | null;
      assignedUserId?: string | null; // Compatibility field
      priority?: TaskPriority;
      status?: TaskStatus;
      dueDate?: Date | string | null;
      startDate?: Date | string | null;
      estimatedHours?: number | null;
    }
  ) {
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
    }

    const assignedUserId = data.assignedToUserId !== undefined ? data.assignedToUserId : data.assignedUserId;

    // Validate due date
    const finalStart = data.startDate !== undefined ? data.startDate : todo.startDate;
    const finalDue = data.dueDate !== undefined ? data.dueDate : todo.dueDate;
    if (finalStart && finalDue && new Date(finalDue) <= new Date(finalStart)) {
      throw new AppError('Due date must be after start date', 400, 'INVALID_DUE_DATE');
    }

    // Permission and role checks
    let userRole: Role | null = null;
    if (todo.teamId) {
      // Shared todo - verify requester is a member of the team
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }
      userRole = membership.role;

      // Regular member constraints
      if (userRole === Role.MEMBER) {
        // Can only update own assigned tasks
        if (todo.assignedToUserId !== userId) {
          throw new AppError('Members can only update tasks assigned to them', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        // Cannot assign task to anyone else
        if (assignedUserId !== undefined && assignedUserId !== userId && assignedUserId !== null) {
          throw new AppError('Members cannot assign tasks to others', 403, 'CANNOT_ASSIGN_OTHERS');
        }
      }

      // Check assignment target is a team member
      if (assignedUserId) {
        const assigneeMembership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: todo.teamId, userId: assignedUserId } },
        });
        if (!assigneeMembership) {
          throw new AppError('Assignee is not a member of this team', 400, 'ASSIGNEE_NOT_TEAM_MEMBER');
        }
      }
    } else {
      // Private todo - verify ownership
      if (todo.userId !== userId) {
        throw new AppError('Todo not found', 404);
      }
      if (assignedUserId) {
        throw new AppError('Cannot assign personal tasks', 400, 'CANNOT_ASSIGN_PERSONAL_TASK');
      }
    }

    // Validate status transition rules
    let nextStatus = data.status;
    let nextCompleted = data.completed;

    // Harmonize status and completed boolean
    if (nextCompleted !== undefined && nextStatus === undefined) {
      nextStatus = nextCompleted ? TaskStatus.DONE : TaskStatus.TODO;
    } else if (nextStatus !== undefined && nextCompleted === undefined) {
      nextCompleted = nextStatus === TaskStatus.DONE;
    }

    if (nextStatus && nextStatus !== todo.status) {
      const activeRole = userRole ?? Role.OWNER; // Private todo acts as Owner permissions

      // Direct Done: transition to DONE is not allowed for members
      if (nextStatus === TaskStatus.DONE && activeRole === Role.MEMBER) {
        throw new AppError('Direct DONE state changes not allowed for members', 403, 'DIRECT_DONE_NOT_ALLOWED');
      }

      const isDoneToTodo = todo.status === TaskStatus.DONE && nextStatus === TaskStatus.TODO;
      if (isDoneToTodo && activeRole === Role.MEMBER) {
        throw new AppError('Direct DONE state changes not allowed for members', 403, 'DIRECT_DONE_NOT_ALLOWED');
      }

      // Strict allowed transitions check
      if (activeRole === Role.MEMBER) {
        const isTodoToInProgress = todo.status === TaskStatus.TODO && nextStatus === TaskStatus.IN_PROGRESS;
        const isInProgressToInReview = todo.status === TaskStatus.IN_PROGRESS && nextStatus === TaskStatus.IN_REVIEW;

        if (!isTodoToInProgress && !isInProgressToInReview) {
          throw new AppError(`Status transition from ${todo.status} to ${nextStatus} is forbidden for regular members`, 403, 'FORBIDDEN_TRANSITION');
        }
      }
    }

    // Capture changes for task history
    const historyPromises: Promise<any>[] = [];

    if (assignedUserId !== undefined && assignedUserId !== todo.assignedToUserId) {
      historyPromises.push(this.logHistory(todoId, userId, 'TASK_ASSIGNED', todo.assignedToUserId, assignedUserId));
    }

    if (nextStatus !== undefined && nextStatus !== todo.status) {
      historyPromises.push(this.logHistory(todoId, userId, 'STATUS_CHANGED', todo.status, nextStatus));
      
      // Log Review approvals / rejections
      if (nextStatus === TaskStatus.DONE) {
        historyPromises.push(this.logHistory(todoId, userId, 'REVIEW_APPROVED', todo.status, nextStatus));
      } else if (todo.status === TaskStatus.IN_REVIEW && nextStatus === TaskStatus.IN_PROGRESS) {
        historyPromises.push(this.logHistory(todoId, userId, 'REVIEW_REJECTED', todo.status, nextStatus));
      }
    }

    if (data.priority !== undefined && data.priority !== todo.priority) {
      historyPromises.push(this.logHistory(todoId, userId, 'PRIORITY_CHANGED', todo.priority, data.priority));
    }

    if (data.dueDate !== undefined && (data.dueDate ? new Date(data.dueDate).getTime() : 0) !== (todo.dueDate ? todo.dueDate.getTime() : 0)) {
      historyPromises.push(this.logHistory(todoId, userId, 'DUE_DATE_CHANGED', todo.dueDate?.toISOString() ?? null, data.dueDate ? new Date(data.dueDate).toISOString() : null));
    }

    if (data.estimatedHours !== undefined && data.estimatedHours !== todo.estimatedHours) {
      historyPromises.push(this.logHistory(todoId, userId, 'ESTIMATED_HOURS_CHANGED', todo.estimatedHours?.toString() ?? null, data.estimatedHours?.toString() ?? null));
    }

    // Perform DB updates
    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        completed: nextCompleted !== undefined ? nextCompleted : undefined,
        assignedToUserId: assignedUserId !== undefined ? assignedUserId : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
        status: nextStatus !== undefined ? nextStatus : undefined,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : undefined,
        completedAt: nextCompleted === true ? new Date() : (nextCompleted === false ? null : undefined),
      },
    });

    await Promise.all(historyPromises);

    // Deriving events to trigger
    const oldStatus = todo.status;
    const updatedStatus = updatedTodo.status;

    if (updatedStatus !== oldStatus) {
      if (updatedStatus === TaskStatus.IN_PROGRESS && oldStatus === TaskStatus.TODO) {
        eventEmitter.emit('task.started', { todo: updatedTodo, actingUserId: userId });
      } else if (updatedStatus === TaskStatus.IN_REVIEW && oldStatus !== TaskStatus.IN_REVIEW) {
        eventEmitter.emit('task.submitted_for_review', { todo: updatedTodo, actingUserId: userId });
      } else if (oldStatus === TaskStatus.IN_REVIEW && updatedStatus === TaskStatus.DONE) {
        eventEmitter.emit('task.review_approved', { todo: updatedTodo, actingUserId: userId });
      } else if (oldStatus === TaskStatus.IN_REVIEW && updatedStatus === TaskStatus.IN_PROGRESS) {
        eventEmitter.emit('task.review_rejected', { todo: updatedTodo, actingUserId: userId });
      } else if (updatedStatus === TaskStatus.DONE && oldStatus !== TaskStatus.DONE) {
        eventEmitter.emit('todo.completed', { todo: updatedTodo, actingUserId: userId });
      }
    }

    const oldAssignee = todo.assignedToUserId;
    const nextAssignee = updatedTodo.assignedToUserId;

    if (nextAssignee !== oldAssignee) {
      if (nextAssignee) {
        eventEmitter.emit('todo.assigned', { todo: updatedTodo, assigneeId: nextAssignee, actingUserId: userId });
      } else {
        eventEmitter.emit('todo.unassigned', { todo: updatedTodo, oldAssigneeId: oldAssignee, actingUserId: userId });
      }
    }

    return updatedTodo;
  }

  static async deleteTodo(userId: string, todoId: string) {
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
    }

    if (todo.teamId) {
      // Shared todo - verify requester is a member of the team
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }

      // Member cannot delete tasks unless they created them or are Owner/Admin
      if (membership.role === Role.MEMBER && todo.userId !== userId) {
        throw new AppError('You do not have permission to delete this task', 403, 'INSUFFICIENT_PERMISSIONS');
      }
    } else {
      // Private todo - verify ownership
      if (todo.userId !== userId) {
        throw new AppError('Todo not found', 404);
      }
    }

    await prisma.todo.delete({
      where: { id: todoId },
    });

    eventEmitter.emit('todo.deleted', { todo, actingUserId: userId });

    return { message: 'Todo deleted successfully' };
  }

  // --- TASK COMMENTS APIS ---

  static async addComment(userId: string, taskId: string, message: string) {
    const todo = await prisma.todo.findUnique({ where: { id: taskId } });
    if (!todo) throw new AppError('Task not found', 404);

    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) throw new AppError('Not a member of this team', 403, 'NOT_TEAM_MEMBER');
    } else {
      if (todo.userId !== userId) throw new AppError('Forbidden', 403);
    }

    const comment = await prisma.taskComment.create({
      data: { taskId, userId, message },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    });

    await this.logHistory(taskId, userId, 'COMMENT_ADDED', null, message);

    eventEmitter.emit('task.comment_added', {
      comment,
      taskTitle: todo.title,
      teamId: todo.teamId,
      actingUserId: userId,
    });

    return comment;
  }

  static async getComments(userId: string, taskId: string) {
    const todo = await prisma.todo.findUnique({ where: { id: taskId } });
    if (!todo) throw new AppError('Task not found', 404);

    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) throw new AppError('Not a member of this team', 403, 'NOT_TEAM_MEMBER');
    } else {
      if (todo.userId !== userId) throw new AppError('Forbidden', 403);
    }

    return prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' }, // Newest last
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    });
  }

  static async updateComment(userId: string, commentId: string, message: string) {
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId !== userId) throw new AppError('You can only edit your own comments', 403);

    return prisma.taskComment.update({
      where: { id: commentId },
      data: { message },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
      }
    });
  }

  static async deleteComment(userId: string, commentId: string) {
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId !== userId) throw new AppError('You can only delete your own comments', 403);

    await prisma.taskComment.delete({ where: { id: commentId } });

    return { message: 'Comment deleted successfully' };
  }

  // --- TASK ATTACHMENTS APIS ---

  static async addAttachment(
    userId: string,
    taskId: string,
    data: { fileName: string; fileType: string; fileSize: number; storagePath: string }
  ) {
    const todo = await prisma.todo.findUnique({ where: { id: taskId } });
    if (!todo) throw new AppError('Task not found', 404);

    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) throw new AppError('Not a member of this team', 403, 'NOT_TEAM_MEMBER');

      // Enforce Permission Matrix: only Owners/Admins or the Assigned Member can upload
      if (membership.role === Role.MEMBER && todo.assignedToUserId !== userId) {
        throw new AppError('Only the assigned member or admins can upload attachments to this task', 403);
      }
    } else {
      if (todo.userId !== userId) throw new AppError('Forbidden', 403);
    }

    const attachmentId = require('crypto').randomUUID();
    const fs = require('fs');
    const path = require('path');
    const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(UPLOADS_ROOT)) {
      fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    }

    const safeFileName = path.basename(data.fileName);
    const diskFileName = `${attachmentId}_${safeFileName}`;
    const absolutePath = path.resolve(UPLOADS_ROOT, diskFileName);

    const dummyContent = `Simulated upload content for file: ${safeFileName}`;
    const buffer = Buffer.alloc(data.fileSize, dummyContent);
    fs.writeFileSync(absolutePath, buffer);

    const attachment = await prisma.taskAttachment.create({
      data: {
        id: attachmentId,
        taskId,
        uploadedByUserId: userId,
        fileName: safeFileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        storagePath: diskFileName,
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } }
      }
    });

    await this.logHistory(taskId, userId, 'ATTACHMENT_UPLOADED', null, safeFileName);

    eventEmitter.emit('task.attachment_uploaded', {
      attachment,
      taskTitle: todo.title,
      teamId: todo.teamId,
      actingUserId: userId,
    });

    return attachment;
  }

  static async getAttachments(userId: string, taskId: string) {
    const todo = await prisma.todo.findUnique({ where: { id: taskId } });
    if (!todo) throw new AppError('Task not found', 404);

    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) throw new AppError('Not a member of this team', 403, 'NOT_TEAM_MEMBER');
    } else {
      if (todo.userId !== userId) throw new AppError('Forbidden', 403);
    }

    return prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { id: true, name: true, email: true } }
      }
    });
  }

  static async deleteAttachment(userId: string, attachmentId: string) {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true }
    });
    if (!attachment) throw new AppError('Attachment not found', 404);

    let allowed = false;
    if (attachment.uploadedByUserId === userId) {
      allowed = true;
    } else if (attachment.task.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: attachment.task.teamId, userId } },
      });
      if (membership && (membership.role === Role.OWNER || membership.role === Role.ADMIN)) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new AppError('You do not have permission to delete this attachment', 403);
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });

    const fs = require('fs');
    const path = require('path');
    const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
    const absolutePath = path.resolve(UPLOADS_ROOT, path.basename(attachment.storagePath));
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        // Safe fail-silent for disk operations
      }
    }

    return { message: 'Attachment deleted successfully' };
  }

  // --- SPECIFIC ASSIGNMENT TRIGGER METHODS ---

  static async assignTask(userId: string, taskId: string, assignedToUserId: string) {
    return this.updateTodo(userId, taskId, { assignedToUserId });
  }

  static async unassignTask(userId: string, taskId: string) {
    return this.updateTodo(userId, taskId, { assignedToUserId: null });
  }
}
