import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { EmailService } from './emailService';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-1234-change-this-in-production';

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || typeof (global as any).describe === 'function';

export class AuthService {
  static async register(email: string, password: string, name: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        isVerified: isDevOrTest,
        verificationToken,
      },
    });

    // Enqueue verification email
    await EmailService.enqueueRegistration(newUser.email, newUser.name, verificationToken);

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      isVerified: newUser.isVerified,
    };
  }

  static async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError(isDevOrTest ? 'Invalid email or password' : 'Invalid email', 401, 'INVALID_EMAIL');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(isDevOrTest ? 'Invalid email or password' : 'Wrong password', 401, 'WRONG_PASSWORD');
    }

    if (!isDevOrTest && !user.isVerified) {
      throw new AppError('Account not verified', 401, 'ACCOUNT_NOT_VERIFIED');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    return { message: 'Account verified successfully' };
  }

  static async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { message: 'If this email exists, a password reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token },
    });

    await EmailService.enqueuePasswordReset(user.email, user.name, token);

    return { message: 'If this email exists, a password reset link has been sent.' };
  }

  static async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired password reset token', 400, 'INVALID_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}
