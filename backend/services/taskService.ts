import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { eventEmitter } from './eventService';

export interface TaskFilterOptions {
  completed?: boolean;
  search?: string;
  teamId?: string;
}

export class TaskService {
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

    return todo;
  }

  static async createTodo(
    userId: string,
    data: { title: string; description?: string; teamId?: string; assignedUserId?: string }
  ) {
    if (data.teamId) {
      // Verify membership before creating team todo
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: data.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }

      if (data.assignedUserId) {
        // Verify assignee is a member of the team
        const assigneeMembership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: data.teamId, userId: data.assignedUserId } },
        });
        if (!assigneeMembership) {
          throw new AppError('Assignee is not a member of this team', 400, 'ASSIGNEE_NOT_TEAM_MEMBER');
        }
      }
    } else if (data.assignedUserId) {
      throw new AppError('Cannot assign personal tasks', 400, 'CANNOT_ASSIGN_PERSONAL_TASK');
    }

    const todo = await prisma.todo.create({
      data: {
        title: data.title,
        description: data.description ?? '',
        userId,
        teamId: data.teamId ?? null,
        assignedUserId: data.assignedUserId ?? null,
      },
    });

    eventEmitter.emit('todo.created', { todo, actingUserId: userId });

    if (todo.assignedUserId) {
      eventEmitter.emit('todo.assigned', { todo, assigneeId: todo.assignedUserId, actingUserId: userId });
    }

    return todo;
  }

  static async updateTodo(
    userId: string,
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean; assignedUserId?: string | null }
  ) {
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

      if (data.assignedUserId) {
        // Verify assignee is a member of the team
        const assigneeMembership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: todo.teamId, userId: data.assignedUserId } },
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
      if (data.assignedUserId) {
        throw new AppError('Cannot assign personal tasks', 400, 'CANNOT_ASSIGN_PERSONAL_TASK');
      }
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        completed: data.completed !== undefined ? data.completed : undefined,
        assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId : undefined,
      },
    });

    if (data.completed === true && !todo.completed) {
      eventEmitter.emit('todo.completed', { todo: updatedTodo, actingUserId: userId });
    } else {
      eventEmitter.emit('todo.updated', { todo: updatedTodo, actingUserId: userId });
    }

    // If assignment changed and is not null
    if (data.assignedUserId && data.assignedUserId !== todo.assignedUserId) {
      eventEmitter.emit('todo.assigned', { todo: updatedTodo, assigneeId: data.assignedUserId, actingUserId: userId });
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
}
