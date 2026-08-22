import prisma from '../database/client';
import { logger } from '../middleware/logging';
import fs from 'fs';
import path from 'path';

let lastDueCheck = 0;

export class EmailService {
  private static emailLogsDir = path.resolve(__dirname, '../emails_log');
  private static workerStartupTime = new Date();

  private static getWorkerConfig() {
    return {
      enabled: process.env.EMAIL_WORKER_ENABLED !== 'false',
      interval: parseInt(process.env.EMAIL_WORKER_INTERVAL || '10000', 10),
      ignoreHistorical: process.env.NODE_ENV !== 'production',
    };
  }

  private static initLogsDir() {
    if (!fs.existsSync(this.emailLogsDir)) {
      fs.mkdirSync(this.emailLogsDir, { recursive: true });
    }
  }

  private static getBrandedTemplate(title: string, bodyContent: string, ctaUrl?: string, ctaText?: string): string {
    const ctaButton = ctaUrl && ctaText 
      ? `<div style="margin: 30px 0; text-align: center;">
          <a href="${ctaUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);">
            ${ctaText}
          </a>
         </div>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-top: 6px solid #6366f1;">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px; text-align: center; background-color: #fafbfd; border-bottom: 1px solid #f1f3f7;">
                    <div style="font-size: 24px; font-weight: bold; color: #1e1b4b; letter-spacing: -0.5px;">
                      ⚡ Antigravity <span style="color: #6366f1;">Todo</span>
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Productive Workspace
                    </div>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                    <h2 style="margin-top: 0; color: #111827; font-size: 22px; font-weight: 700;">${title}</h2>
                    ${bodyContent}
                    ${ctaButton}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #fafbfd; border-top: 1px solid #f1f3f7;">
                    <p style="margin: 0 0 8px 0;">&copy; 2026 Antigravity. All rights reserved.</p>
                    <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private static async enqueue(to: string, subject: string, html: string) {
    try {
      return await prisma.emailQueue.create({
        data: { to, subject, html },
      });
    } catch (err) {
      logger.error('Failed to enqueue email:', err);
    }
  }

  // Email Reminders and Events

  static async enqueueRegistration(email: string, name: string, token: string) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/verify-email?token=${token}`;
    const html = this.getBrandedTemplate(
      'Verify Your Account',
      `<p>Hi ${name},</p>
       <p>Thank you for registering on Antigravity Todo! Please click the button below to verify your email address and activate your account.</p>
       <p>If you did not create this account, you can safely ignore this email.</p>`,
      url,
      'Verify Account'
    );
    await this.enqueue(email, 'Welcome to Antigravity Todo - Verify Email', html);
  }

  static async enqueuePasswordReset(email: string, name: string, token: string) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/reset-password?token=${token}`;
    const html = this.getBrandedTemplate(
      'Reset Your Password',
      `<p>Hi ${name},</p>
       <p>You requested a password reset for your Antigravity account. Click the button below to choose a new password.</p>
       <p>This link is valid for 1 hour. If you didn't request a password reset, please ignore this message.</p>`,
      url,
      'Reset Password'
    );
    await this.enqueue(email, 'Reset Password Request', html);
  }

  static async enqueueInvitation(email: string, inviterName: string, teamName: string, token: string) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/accept-invite?token=${token}`;
    const html = this.getBrandedTemplate(
      'Team Invitation Received',
      `<p>Hello,</p>
       <p><strong>${inviterName}</strong> has invited you to join the team workspace <strong>"${teamName}"</strong>.</p>
       <p>Click the button below to view the invitation details and accept or decline.</p>`,
      url,
      'View Invitation'
    );
    await this.enqueue(email, `Join "${teamName}" on Antigravity`, html);
  }

  static async enqueueRolePromotion(email: string, name: string, teamName: string, newRole: string) {
    const html = this.getBrandedTemplate(
      'Role Promotion Announcement',
      `<p>Hi ${name},</p>
       <p>Congratulations! Your role in the team workspace <strong>"${teamName}"</strong> has been updated to <strong>${newRole}</strong>.</p>
       <p>You can now access permissions and actions corresponding to your new role.</p>`
    );
    await this.enqueue(email, `Role Updated in "${teamName}"`, html);
  }

  static async enqueueWorkspaceInvite(email: string, inviterName: string, teamName: string, token: string) {
    await this.enqueueInvitation(email, inviterName, teamName, token);
  }

  static async enqueueWorkspaceAnnouncementEmail(email: string, teamName: string, message: string) {
    const html = this.getBrandedTemplate(
      `Announcement: ${teamName}`,
      `<p>Hello,</p>
       <p>${message}</p>`
    );
    await this.enqueue(email, `Workspace Announcement: ${teamName}`, html);
  }

  static async enqueueAccountDeletion(email: string, name: string) {
    const html = this.getBrandedTemplate(
      'Account Deleted Successfully',
      `<p>Hi ${name},</p>
       <p>Your account on Antigravity Todo has been permanently deleted in accordance with your request.</p>
       <p>We are sorry to see you go! Thank you for using Antigravity.</p>`
    );
    await this.enqueue(email, 'Antigravity Account Deactivation', html);
  }

  static async enqueueDueReminder(email: string, name: string, taskTitle: string, dueDate: Date) {
    const formattedDate = new Date(dueDate).toLocaleString();
    const html = this.getBrandedTemplate(
      'Task Deadline Reminder',
      `<p>Hi ${name},</p>
       <p>This is a reminder that your assigned task <strong>"${taskTitle}"</strong> is due soon.</p>
       <p><strong>Deadline:</strong> ${formattedDate}</p>
       <p>Please review and complete the task as scheduled.</p>`
    );
    await this.enqueue(email, `Reminder: Task "${taskTitle}" is due soon`, html);
  }

  // Queue Processing Worker

  static async checkDueAndOverdueTasks() {
    try {
      const now = new Date();
      // Fetch uncompleted tasks that have a dueDate and are not archived
      const activeTasks = await prisma.todo.findMany({
        where: {
          completed: false,
          archived: false,
          dueDate: { not: null },
        },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      for (const task of activeTasks) {
        if (!task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const isOverdue = dueDate < now;
        
        // Due today: due date matches today's date
        const isDueToday = !isOverdue && dueDate.toDateString() === now.toDateString();

        const recipient = task.assignedToUser || task.user;
        if (!recipient) continue;

        if (isOverdue) {
          const type = 'TASK_OVERDUE';
          const title = 'Task Overdue Notice';
          const message = `Task "${task.title}" is overdue (due: ${dueDate.toLocaleDateString()}).`;

          // Check if notification already sent to avoid duplicates
          const existing = await prisma.notification.findFirst({
            where: { userId: recipient.id, type, metadata: task.id },
          });

          if (!existing) {
            await prisma.notification.create({
              data: { userId: recipient.id, type, title, message, metadata: task.id },
            });
            // Also log to activity logs for smart timeline
            await prisma.activityLog.create({
              data: {
                teamId: task.teamId,
                userId: recipient.id,
                action: 'TASK_OVERDUE',
                entityType: 'Todo',
                entityId: task.id,
                metadata: { title: task.title, teamId: task.teamId },
              },
            });
            await this.enqueueDueReminder(recipient.email, recipient.name, task.title, dueDate);
          }
        } else if (isDueToday) {
          const type = 'TASK_DUE_TODAY';
          const title = 'Task Due Today';
          const message = `Task "${task.title}" is due today at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

          const existing = await prisma.notification.findFirst({
            where: { userId: recipient.id, type, metadata: task.id },
          });

          if (!existing) {
            await prisma.notification.create({
              data: { userId: recipient.id, type, title, message, metadata: task.id },
            });
            await this.enqueueDueReminder(recipient.email, recipient.name, task.title, dueDate);
          }
        }
      }
    } catch (err) {
      logger.error('Error checking due/overdue tasks:', err);
    }
  }

  static async processEmailQueue() {
    const config = this.getWorkerConfig();
    if (!config.enabled) return;

    this.initLogsDir();
    try {
      // Periodic check run every minute
      const nowMs = Date.now();
      if (nowMs - lastDueCheck > 60000) {
        lastDueCheck = nowMs;
        void this.checkDueAndOverdueTasks();
      }

      const whereClause: any = { status: 'PENDING' };
      if (config.ignoreHistorical) {
        whereClause.createdAt = { gte: this.workerStartupTime };
      }

      const pendingEmails = await prisma.emailQueue.findMany({
        where: whereClause,
        take: 10,
      });

      if (pendingEmails.length === 0) return;

      logger.debug(`EmailService: processing ${pendingEmails.length} pending email(s)...`);

      for (const email of pendingEmails) {
        try {
          const sanitizedSubject = email.subject.replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${email.id}_${sanitizedSubject}.html`;
          const filePath = path.join(this.emailLogsDir, fileName);

          fs.writeFileSync(filePath, email.html, 'utf-8');

          await prisma.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          logger.info(`EmailService: successfully sent email ID ${email.id} to ${email.to}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error(`EmailService: failed to send email ID ${email.id}: ${errMsg}`);
          await prisma.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'FAILED',
              error: errMsg,
            },
          });
        }
      }
    } catch (err) {
      logger.error('Error in Email Queue worker sweep:', err);
    }
  }

  // Start periodic background sweep
  static startWorker() {
    const config = this.getWorkerConfig();
    if (!config.enabled) {
      logger.info('EmailService: background queue worker is disabled.');
      return;
    }
    logger.info(`EmailService: starting background queue worker (every ${config.interval}ms)...`);
    setInterval(() => {
      void this.processEmailQueue();
    }, config.interval);
  }
}
