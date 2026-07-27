import { describe, expect, it, beforeEach } from 'vitest';
import prisma from '../../database/client';
import { CollaborationService } from '../collaborationService';
import { AuthService } from '../authService';

describe('ActivityService via CollaborationService', () => {
  beforeEach(async () => {
    await prisma.activityLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.todo.deleteMany({});
    await prisma.teamInvite.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('logs activity events and queries personal timeline', async () => {
    const user = await AuthService.register('user@example.com', 'password123', 'Test User');

    const log = await CollaborationService.createActivityEvent({
      userId: user.id,
      action: 'TODO_CREATE',
      entityType: 'Todo',
      entityId: 'todo-uuid-123',
      metadata: { title: 'Personal task' },
    });

    expect(log.id).toBeDefined();

    const timeline = await CollaborationService.getTimeline(user.id, {});
    expect(timeline.data.length).toBe(1);
    expect(timeline.data[0].action).toBe('TODO_CREATE');
    expect((timeline.data[0].metadata as any).title).toBe('Personal task');
  });

  it('logs team activities and filters by team and action types', async () => {
    const userA = await AuthService.register('usera@example.com', 'password123', 'User A');
    const userB = await AuthService.register('userb@example.com', 'password123', 'User B');

    const team = await CollaborationService.createTeam(userA.id, 'Alpha Team');

    await CollaborationService.createActivityEvent({
      teamId: team!.id,
      userId: userA.id,
      action: 'TEAM_RENAME',
      entityType: 'Team',
      entityId: team!.id,
      metadata: { oldName: 'Alpha Team', newName: 'Beta Team' },
    });

    const unifiedTimeline = await CollaborationService.getTimeline(userA.id, {});
    expect(unifiedTimeline.data.some((l) => l.action === 'TEAM_RENAME')).toBe(true);

    const unifiedB = await CollaborationService.getTimeline(userB.id, {});
    expect(unifiedB.data.some((l) => l.action === 'TEAM_RENAME')).toBe(false);

    const invite = await CollaborationService.inviteMember(userA.id, team!.id, 'userb@example.com');
    await CollaborationService.acceptInvitation(userB.id, invite.token);

    const unifiedBJoined = await CollaborationService.getTimeline(userB.id, {});
    expect(unifiedBJoined.data.some((l) => l.action === 'TEAM_RENAME')).toBe(true);

    const teamTimeline = await CollaborationService.getTeamTimeline(userB.id, team!.id, { type: 'Team' });
    expect(teamTimeline.data.every((l) => l.entityType === 'Team')).toBe(true);
  });
});
