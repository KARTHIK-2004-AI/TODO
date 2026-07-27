import { Router, Request, Response, NextFunction } from 'express';
import { CollaborationService } from '../services/collaborationService';
import { authenticate } from '../middleware/auth';

const notificationRouter = Router();

// Apply auth middleware to all notification routes
notificationRouter.use(authenticate);

// GET /api/notifications - Fetch notifications
notificationRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await CollaborationService.getNotifications(userId);
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Fetch unread notifications count
notificationRouter.get('/unread-count', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const unread = await CollaborationService.getUnreadNotificationsCount(userId);
    res.status(200).json(unread);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
notificationRouter.put('/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;
    const notification = await CollaborationService.markNotificationAsRead(userId, notificationId);
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
notificationRouter.put('/read-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await CollaborationService.markAllNotificationsAsRead(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete a notification
notificationRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;
    const result = await CollaborationService.deleteNotification(userId, notificationId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default notificationRouter;
