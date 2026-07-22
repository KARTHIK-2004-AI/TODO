import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';

export interface TodoFilterOptions {
  completed?: boolean;
  search?: string;
}

export class TodoService {
  static async getTodos(userId: string, options: TodoFilterOptions) {
    const whereClause: any = {
      userId,
    };

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
    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
    }

    return todo;
  }

  static async createTodo(userId: string, data: { title: string; description?: string }) {
    return prisma.todo.create({
      data: {
        title: data.title,
        description: data.description ?? '',
        userId,
      },
    });
  }

  static async updateTodo(
    userId: string,
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean }
  ) {
    // First verify ownership
    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
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
    // First verify ownership
    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new AppError('Todo not found', 404);
    }

    await prisma.todo.delete({
      where: { id: todoId },
    });

    return { message: 'Todo deleted successfully' };
  }
}
