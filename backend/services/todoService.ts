import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';

export interface TodoFilterOptions {
  completed?: boolean;
  search?: string;
  teamId?: string;
}

export class TodoService {
  static async getTodos(userId: string, options: TodoFilterOptions) {
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
    data: { title: string; description?: string; teamId?: string }
  ) {
    if (data.teamId) {
      // Verify membership before creating team todo
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: data.teamId, userId } },
      });

      if (!membership) {
        throw new AppError('Requester is not a member of this team', 403, 'NOT_TEAM_MEMBER');
      }
    }

    return prisma.todo.create({
      data: {
        title: data.title,
        description: data.description ?? '',
        userId,
        teamId: data.teamId ?? null,
      },
    });
  }

  static async updateTodo(
    userId: string,
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean }
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
    } else {
      // Private todo - verify ownership
      if (todo.userId !== userId) {
        throw new AppError('Todo not found', 404);
      }
    }

    return prisma.todo.update({
      where: { id: todoId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        completed: data.completed !== undefined ? data.completed : undefined,
      },
    });
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

    return { message: 'Todo deleted successfully' };
  }
}
