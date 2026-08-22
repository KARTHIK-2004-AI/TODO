import { describe, expect, it, beforeEach } from 'vitest';
import prisma from '../../database/client';
import { EmailService } from '../emailService';

describe('EmailService', () => {
  beforeEach(async () => {
    await prisma.emailQueue.deleteMany({});
  });

  it('successfully enqueues and processes current-session emails', async () => {
    // Enqueue an email
    await EmailService.enqueueRegistration('test@example.com', 'Test User', 'token123');

    // Verify it is enqueued with PENDING status
    const pending = await prisma.emailQueue.findMany({ where: { status: 'PENDING' } });
    expect(pending.length).toBe(1);
    expect(pending[0].to).toBe('test@example.com');

    // Process the queue
    await EmailService.processEmailQueue();

    // Verify it was processed and updated to SENT
    const processed = await prisma.emailQueue.findUnique({
      where: { id: pending[0].id }
    });
    expect(processed?.status).toBe('SENT');
    expect(processed?.sentAt).toBeDefined();
  });

  it('ignores historical pending jobs during development/test mode', async () => {
    // Enqueue a historical email
    const historicalEmail = await prisma.emailQueue.create({
      data: {
        to: 'old@example.com',
        subject: 'Old Verification',
        html: '<p>Old</p>',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      }
    });

    // Enqueue a new email
    const newEmail = await prisma.emailQueue.create({
      data: {
        to: 'new@example.com',
        subject: 'New Verification',
        html: '<p>New</p>',
        status: 'PENDING',
        createdAt: new Date(), // current
      }
    });

    // Process the queue
    await EmailService.processEmailQueue();

    // The historical email should still be PENDING
    const historicalResult = await prisma.emailQueue.findUnique({
      where: { id: historicalEmail.id }
    });
    expect(historicalResult?.status).toBe('PENDING');

    // The new email should be SENT
    const newResult = await prisma.emailQueue.findUnique({
      where: { id: newEmail.id }
    });
    expect(newResult?.status).toBe('SENT');
  });

  it('processes historical pending jobs when running in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // Enqueue a historical email
      const historicalEmail = await prisma.emailQueue.create({
        data: {
          to: 'old-prod@example.com',
          subject: 'Old Prod Verification',
          html: '<p>Old Prod</p>',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        }
      });

      // Process the queue
      await EmailService.processEmailQueue();

      // The historical email should be SENT in production
      const historicalResult = await prisma.emailQueue.findUnique({
        where: { id: historicalEmail.id }
      });
      expect(historicalResult?.status).toBe('SENT');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('respects EMAIL_WORKER_ENABLED configuration', async () => {
    const originalEnabled = process.env.EMAIL_WORKER_ENABLED;
    try {
      process.env.EMAIL_WORKER_ENABLED = 'false';

      await EmailService.enqueueRegistration('disabled@example.com', 'Disabled Test', 'token456');

      // Process queue
      await EmailService.processEmailQueue();

      // The email should remain PENDING because worker is disabled
      const pending = await prisma.emailQueue.findFirst({
        where: { to: 'disabled@example.com' }
      });
      expect(pending?.status).toBe('PENDING');
    } finally {
      process.env.EMAIL_WORKER_ENABLED = originalEnabled;
    }
  });
});
