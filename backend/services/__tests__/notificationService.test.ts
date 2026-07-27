import { describe, expect, it, beforeEach } from 'vitest';
import prisma from '../../database/client';
import { CollaborationService } from '../collaborationService';
import { AuthService } from '../authService';

describe('NotificationService via CollaborationService', () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany({});
    await prisma.todo.deleteMany({});
    await prisma.teamInvite.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('creates, retrieves, and updates notifications', async () => {
    const user = await AuthService.register('user@example.com', 'password123', 'Test User');

    const notification = await CollaborationService.createNotification({
      userId: user.id,
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'TODO_CREATED',
    });

    expect(notification.id).toBeDefined();
    expect(notification.isRead).toBe(false);

    const list = await CollaborationService.getNotifications(user.id);
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Test Notification');

    let unread = await CollaborationService.getUnreadNotificationsCount(user.id);
    expect(unread.count).toBe(1);

    await CollaborationService.markNotificationAsRead(user.id, notification.id);
    unread = await CollaborationService.getUnreadNotificationsCount(user.id);
    expect(unread.count).toBe(0);

    await CollaborationService.createNotification({
      userId: user.id,
      title: 'Second Notification',
      message: 'Another test notification',
      type: 'TEAM_RENAMED',
    });
    unread = await CollaborationService.getUnreadNotificationsCount(user.id);
    expect(unread.count).toBe(1);

    await CollaborationService.markAllNotificationsAsRead(user.id);
    unread = await CollaborationService.getUnreadNotificationsCount(user.id);
    expect(unread.count).toBe(0);
  });

  it('deletes notifications', async () => {
    const user = await AuthService.register('user@example.com', 'password123', 'Test User');

    const notif = await CollaborationService.createNotification({
      userId: user.id,
      title: 'To Delete',
      message: 'Deleting soon',
      type: 'TEAM_DELETED',
    });

    await CollaborationService.deleteNotification(user.id, notif.id);
    const list = await CollaborationService.getNotifications(user.id);
    expect(list.length).toBe(0);
  });
});
