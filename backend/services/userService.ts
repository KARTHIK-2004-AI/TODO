import bcrypt from 'bcrypt';
import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 10;

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  timezone?: string;
}

export class UserService {
  /**
   * Retrieve profile for the authenticated user.
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        phoneNumber: true,
        avatarUrl: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Update profile information for the authenticated user.
   */
  static async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let finalAvatarUrl = data.avatarUrl;
    if (data.avatarUrl && data.avatarUrl.startsWith('data:image/')) {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      const matches = data.avatarUrl.match(/^data:image\/([A-Za-z0-9\-+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
        if (!fs.existsSync(UPLOADS_ROOT)) {
          fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
        }
        
        const uniqueId = crypto.randomUUID();
        const fileName = `avatar_${userId}_${uniqueId}.${ext}`;
        const absolutePath = path.resolve(UPLOADS_ROOT, fileName);
        
        fs.writeFileSync(absolutePath, buffer);
        finalAvatarUrl = `/api/uploads/${fileName}`;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.avatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        phoneNumber: true,
        avatarUrl: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Securely update user password after validating current password.
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Incorrect current password', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Retrieve preferences for the authenticated user.
   */
  static async getSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    try {
      return JSON.parse(user.preferences || '{}');
    } catch {
      return {
        theme: 'system',
        notifications: true,
        emailAlerts: true,
        language: 'en',
      };
    }
  }

  /**
   * Update preferences for the authenticated user.
   */
  static async updateSettings(userId: string, preferencesData: Record<string, any>) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let currentPreferences: Record<string, any> = {};
    try {
      currentPreferences = JSON.parse(user.preferences || '{}');
    } catch {
      currentPreferences = {};
    }

    const updatedPreferences = {
      ...currentPreferences,
      ...preferencesData,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(updatedPreferences),
      },
    });

    return updatedPreferences;
  }

  /**
   * Permanently delete user account and associated todos.
   */
  static async deleteAccount(userId: string, password?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Incorrect password for account deletion', 400);
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }
}
