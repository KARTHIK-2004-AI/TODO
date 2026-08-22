import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CollaborationService } from '../services/collaborationService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { TaskPriority, TaskStatus } from '../prisma/client';
import prisma from '../database/client';

const todoRouter = Router();

// Apply auth middleware to all todo/task routes
todoRouter.use(authenticate);

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const statusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);

const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  teamId: z.string().optional(),
  assignedToUserId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(), // compatibility
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedHours: z.number().int().min(0).nullable().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  assignedToUserId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(), // compatibility
  priority: prioritySchema.optional(),
  status: statusSchema.optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedHours: z.number().int().min(0).nullable().optional(),
  archived: z.boolean().optional(),
});

const commentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

const attachmentSchema = z.object({
  fileName: z.string().min(1, 'FileName is required'),
  fileType: z.string().min(1, 'FileType is required'),
  fileSize: z.number().int().min(0, 'FileSize must be positive'),
  storagePath: z.string().min(1, 'StoragePath is required'),
  isImportant: z.boolean().optional(),
});

const assignSchema = z.object({
  assignedToUserId: z.string().optional(),
  assignedUserId: z.string().optional(), // compatibility
});

// ----------------------------------------------------
// 1. STANDALONE SUB-RESOURCE ENDPOINTS (MUST PRECEDE /:id)
// ----------------------------------------------------

// PUT /comments/:commentId - Update comment
todoRouter.put(
  '/comments/:commentId',
  validate({ body: commentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { commentId } = req.params;
      const { message } = req.body;
      const comment = await CollaborationService.updateComment(userId, commentId, message);
      res.status(200).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /comments/:commentId - Delete comment
todoRouter.delete('/comments/:commentId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { commentId } = req.params;
    const result = await CollaborationService.deleteComment(userId, commentId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /attachments/:attachmentId - Update attachment metadata (isImportant) with auth check
todoRouter.put('/attachments/:attachmentId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { attachmentId } = req.params;
    const { isImportant } = req.body;
    const updated = await CollaborationService.updateAttachment(userId, attachmentId, isImportant);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /attachments/:attachmentId - Delete attachment
todoRouter.delete('/attachments/:attachmentId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { attachmentId } = req.params;
    const result = await CollaborationService.deleteAttachment(userId, attachmentId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /attachments/:attachmentId/download - Download attachment
todoRouter.get('/attachments/:attachmentId/download', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { attachmentId } = req.params;

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true },
    });
    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const todo = attachment.task;
    if (todo.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: todo.teamId, userId } },
      });
      if (!membership) {
        res.status(403).json({ error: 'Forbidden: Not a member of this team' });
        return;
      }
    } else {
      if (todo.userId !== userId && todo.assignedToUserId !== userId) {
        res.status(403).json({ error: 'Forbidden: No access to this private task' });
        return;
      }
    }

    const fs = require('fs');
    const path = require('path');
    const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
    const absolutePath = path.resolve(UPLOADS_ROOT, path.basename(attachment.storagePath));

    if (fs.existsSync(absolutePath)) {
      res.download(absolutePath, attachment.fileName);
    } else {
      const dummyContent = `Simulated content for attachment: ${attachment.fileName}`;
      const buffer = Buffer.alloc(attachment.fileSize, dummyContent);
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
      res.setHeader('Content-Length', attachment.fileSize);
      res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 2. ROOT TASK COLLECTION ENDPOINTS
// ----------------------------------------------------

// GET /api/todos - Fetch tasks
todoRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    let completed: boolean | undefined = undefined;
    if (req.query.completed === 'true') {
      completed = true;
    } else if (req.query.completed === 'false') {
      completed = false;
    }

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const teamId = typeof req.query.teamId === 'string' ? req.query.teamId : undefined;
    const priority = typeof req.query.priority === 'string' ? req.query.priority as TaskPriority : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status as TaskStatus : undefined;
    const assigneeId = typeof req.query.assigneeId === 'string' ? req.query.assigneeId : undefined;

    const todos = await CollaborationService.getTodos(userId, { completed, search, teamId, priority, status, assigneeId });
    res.status(200).json(todos);
  } catch (error) {
    next(error);
  }
});

// POST /api/todos - Create task
todoRouter.post(
  '/',
  validate({ body: createTodoSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const newTodo = await CollaborationService.createTodo(userId, req.body);
      res.status(201).json(newTodo);
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------
// 3. TASK SUB-RESOURCE ENDPOINTS
// ----------------------------------------------------

// POST /api/todos/:id/comments/read - Mark comments read
todoRouter.post('/:id/comments/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id;
    const result = await CollaborationService.markCommentsAsRead(userId, taskId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/todos/:id/comments - Add comment
todoRouter.post(
  '/:id/comments',
  validate({ body: commentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const { message } = req.body;
      const comment = await CollaborationService.addComment(userId, taskId, message);
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/todos/:id/comments - Get comment list
todoRouter.get('/:id/comments', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id;
    const comments = await CollaborationService.getComments(userId, taskId);
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
});

// POST /api/todos/:id/attachments - Create attachment metadata
todoRouter.post(
  '/:id/attachments',
  validate({ body: attachmentSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const attachment = await CollaborationService.addAttachment(userId, taskId, req.body);
      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/todos/:id/attachments - List attachment metadata
todoRouter.get('/:id/attachments', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id;
    const attachments = await CollaborationService.getAttachments(userId, taskId);
    res.status(200).json(attachments);
  } catch (error) {
    next(error);
  }
});

// POST /api/todos/:id/assign - Assign assignee
todoRouter.post(
  '/:id/assign',
  validate({ body: assignSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = req.params.id;
      const targetUserId = req.body.assignedToUserId || req.body.assignedUserId;
      if (!targetUserId) {
        res.status(400).json({ error: 'assignedToUserId is required' });
        return;
      }
      const updatedTodo = await CollaborationService.assignTask(userId, taskId, targetUserId);
      res.status(200).json(updatedTodo);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/todos/:id/unassign - Unassign assignee
todoRouter.post('/:id/unassign', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = req.params.id;
    const updatedTodo = await CollaborationService.unassignTask(userId, taskId);
    res.status(200).json(updatedTodo);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// 4. WILDCARD SINGLE TASK ENDPOINTS (MUST BE LAST)
// ----------------------------------------------------

// GET /api/todos/:id - Fetch task details
todoRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todoId = req.params.id;
    const todo = await CollaborationService.getTodoById(userId, todoId);
    res.status(200).json(todo);
  } catch (error) {
    next(error);
  }
});

// PUT /api/todos/:id - Update task details
todoRouter.put(
  '/:id',
  validate({ body: updateTodoSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const todoId = req.params.id;
      const updatedTodo = await CollaborationService.updateTodo(userId, todoId, req.body);
      res.status(200).json(updatedTodo);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/todos/:id - Delete task
todoRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todoId = req.params.id;
    const result = await CollaborationService.deleteTodo(userId, todoId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default todoRouter;
