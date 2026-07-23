import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const profileRouter = Router();

// Require authentication for all profile endpoints
profileRouter.use(authenticate);

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  avatarUrl: z.union([z.string().url('Invalid avatar URL format'), z.string().length(0)]).optional(),
  timezone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/**
 * GET /profile
 * Purpose: Retrieve authenticated user profile.
 */
profileRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await UserService.getProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /profile
 * Purpose: Update user profile information.
 */
profileRouter.put(
  '/',
  validate({ body: updateProfileSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const updatedProfile = await UserService.updateProfile(userId, req.body);
      res.status(200).json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /change-password (or /profile/change-password)
 * Purpose: Secure password update.
 */
profileRouter.put(
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

export default profileRouter;
