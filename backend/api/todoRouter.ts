import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TodoService } from '../services/todoService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const todoRouter = Router();

// Apply auth middleware to all todo routes
todoRouter.use(authenticate);

const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

todoRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    // Parse filter query parameters
    let completed: boolean | undefined = undefined;
    if (req.query.completed === 'true') {
      completed = true;
    } else if (req.query.completed === 'false') {
      completed = false;
    }
    
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const todos = await TodoService.getTodos(userId, { completed, search });
    res.status(200).json(todos);
  } catch (error) {
    next(error);
  }
});

todoRouter.post(
  '/',
  validate({ body: createTodoSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { title, description } = req.body;
      const newTodo = await TodoService.createTodo(userId, { title, description });
      res.status(201).json(newTodo);
    } catch (error) {
      next(error);
    }
  }
);

todoRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todoId = req.params.id;
    const todo = await TodoService.getTodoById(userId, todoId);
    res.status(200).json(todo);
  } catch (error) {
    next(error);
  }
});

todoRouter.put(
  '/:id',
  validate({ body: updateTodoSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const todoId = req.params.id;
      const updatedTodo = await TodoService.updateTodo(userId, todoId, req.body);
      res.status(200).json(updatedTodo);
    } catch (error) {
      next(error);
    }
  }
);

todoRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todoId = req.params.id;
    const result = await TodoService.deleteTodo(userId, todoId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default todoRouter;
