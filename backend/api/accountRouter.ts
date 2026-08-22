import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const accountRouter = Router();

// Require authentication for all account endpoints
accountRouter.use(authenticate);

const updateSettingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.boolean().optional(),
    emailAlerts: z.boolean().optional(),
    language: z.string().optional(),
  })
  .passthrough();

const deleteAccountSchema = z.object({
  password: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/**
 * PUT /account/change-password
 * Purpose: Change password.
 */
accountRouter.put(
  '/change-password',
  validate({ body: changePasswordSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await UserService.changePassword(userId, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /account/settings
 * Purpose: Retrieve user preferences.
 */
accountRouter.get('/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const settings = await UserService.getSettings(userId);
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /account/settings
 * Purpose: Update user preferences.
 */
accountRouter.put(
  '/settings',
  validate({ body: updateSettingsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const updatedSettings = await UserService.updateSettings(userId, req.body);
      res.status(200).json(updatedSettings);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /account
 * Purpose: Remove user account securely.
 */
accountRouter.delete(
  '/',
  validate({ body: deleteAccountSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const password = req.body?.password;
      const result = await UserService.deleteAccount(userId, password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default accountRouter;
