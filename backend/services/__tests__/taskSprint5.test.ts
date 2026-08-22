import { describe, expect, it, beforeEach } from 'vitest';
import prisma from '../../database/client';
import { CollaborationService } from '../collaborationService';
import { AuthService } from '../authService';
import { TaskPriority, TaskStatus, Role } from '../../prisma/client';

describe('Sprint 5 Project Execution Engine Backend Tests', () => {
  beforeEach(async () => {
    await prisma.taskHistory.deleteMany({});
    await prisma.taskComment.deleteMany({});
    await prisma.taskAttachment.deleteMany({});
    await prisma.todo.deleteMany({});
    await prisma.teamInvite.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('validates start and due date range validation constraints', async () => {
    const user = await AuthService.register('date@example.com', 'password123', 'User');
    
    // Valid date range (dueDate > startDate)
    const validTask = await CollaborationService.createTodo(user.id, {
      title: 'Valid Task',
      startDate: new Date('2026-07-01'),
      dueDate: new Date('2026-07-05'),
    });
    expect(validTask.id).toBeDefined();

    // Invalid date range (dueDate <= startDate) should throw AppError
    await expect(
      CollaborationService.createTodo(user.id, {
        title: 'Invalid Task',
        startDate: new Date('2026-07-05'),
        dueDate: new Date('2026-07-01'),
      })
    ).rejects.toThrow('Due date must be after start date');
  });

  it('enforces status transition rules and role permissions on team tasks', async () => {
    // 1. Setup users and team
    const owner = await AuthService.register('owner@example.com', 'password123', 'Owner');
    const admin = await AuthService.register('admin@example.com', 'password123', 'Admin');
    const member = await AuthService.register('member@example.com', 'password123', 'Member');
    const outsider = await AuthService.register('outsider@example.com', 'password123', 'Outsider');

    const team = await CollaborationService.createTeam(owner.id, 'Engineering');
    if (!team) throw new Error('Team creation failed');

    // Add Admin & Member
    const inviteAdmin = await CollaborationService.inviteMember(owner.id, team.id, admin.email);
    await CollaborationService.acceptInvitation(admin.id, inviteAdmin.token);
    await CollaborationService.updateTeamRole(owner.id, team.id, admin.id, Role.ADMIN);

    const inviteMember = await CollaborationService.inviteMember(owner.id, team.id, member.email);
    await CollaborationService.acceptInvitation(member.id, inviteMember.token);

    // 2. Create task and assign to member
    const task = await CollaborationService.createTodo(owner.id, {
      title: 'Sprint 5 Deliverables',
      teamId: team.id,
      assignedToUserId: member.id,
    });

    // 3. Outsider access checks
    await expect(CollaborationService.updateTodo(outsider.id, task.id, { status: TaskStatus.IN_PROGRESS })).rejects.toThrow('Requester is not a member of this team');

    // 4. Member (assignee) transitions
    // TODO -> IN_PROGRESS: Allowed
    let updated = await CollaborationService.updateTodo(member.id, task.id, { status: TaskStatus.IN_PROGRESS });
    expect(updated.status).toBe(TaskStatus.IN_PROGRESS);

    // IN_PROGRESS -> IN_REVIEW: Allowed
    updated = await CollaborationService.updateTodo(member.id, task.id, { status: TaskStatus.IN_REVIEW });
    expect(updated.status).toBe(TaskStatus.IN_REVIEW);

    // IN_REVIEW -> DONE: Forbidden for member (must be owner/admin)
    await expect(
      CollaborationService.updateTodo(member.id, task.id, { status: TaskStatus.DONE })
    ).rejects.toThrow('Direct DONE state changes not allowed for members');

    // 5. Admin handles review approval
    // IN_REVIEW -> DONE (Approved): Allowed for Admin
    updated = await CollaborationService.updateTodo(admin.id, task.id, { status: TaskStatus.DONE });
    expect(updated.status).toBe(TaskStatus.DONE);
    expect(updated.completed).toBe(true);

    // DONE -> TODO: Allowed for Owner
    updated = await CollaborationService.updateTodo(owner.id, task.id, { status: TaskStatus.TODO });
    expect(updated.status).toBe(TaskStatus.TODO);
    expect(updated.completed).toBe(false);

    // Reject review: transition IN_REVIEW -> IN_PROGRESS by Admin
    await CollaborationService.updateTodo(member.id, task.id, { status: TaskStatus.IN_PROGRESS });
    await CollaborationService.updateTodo(member.id, task.id, { status: TaskStatus.IN_REVIEW });
    updated = await CollaborationService.updateTodo(admin.id, task.id, { status: TaskStatus.IN_PROGRESS });
    expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('supports discussion comments and validates editing/deletion ownership', async () => {
    const userA = await AuthService.register('a@example.com', 'password123', 'User A');
    const userB = await AuthService.register('b@example.com', 'password123', 'User B');
    const task = await CollaborationService.createTodo(userA.id, { title: 'Discussions task' });

    // User A comments
    const comment = await CollaborationService.addComment(userA.id, task.id, 'First message');
    expect(comment.message).toBe('First message');

    // Retrieve comments
    const comments = await CollaborationService.getComments(userA.id, task.id);
    expect(comments.length).toBe(1);

    // User B attempts to edit comment -> Forbidden
    await expect(CollaborationService.updateComment(userB.id, comment.id, 'Edited')).rejects.toThrow('You can only edit your own comments');

    // User A edits own comment -> Allowed
    const edited = await CollaborationService.updateComment(userA.id, comment.id, 'Updated message');
    expect(edited.message).toBe('Updated message');

    // User B attempts to mark comments as read -> Forbidden
    await expect(CollaborationService.markCommentsAsRead(userB.id, task.id)).rejects.toThrow('Forbidden');

    // User A marks comments as read -> Allowed
    const readResult = await CollaborationService.markCommentsAsRead(userA.id, task.id);
    expect(readResult.message).toBe('Comments marked as read');
    expect(readResult.commentIds).toContain(comment.id);

    // User B attempts to delete comment -> Forbidden
    await expect(CollaborationService.deleteComment(userB.id, comment.id)).rejects.toThrow('You can only delete your own comments');

    // User A deletes own comment -> Allowed
    const deletion = await CollaborationService.deleteComment(userA.id, comment.id);
    expect(deletion.message).toBe('Comment deleted successfully');
  });

  it('tracks audit histories on task updates and creations', async () => {
    const user = await AuthService.register('audit@example.com', 'password123', 'Auditor');
    const task = await CollaborationService.createTodo(user.id, { title: 'Audited task' });

    // Update priority and dates
    await CollaborationService.updateTodo(user.id, task.id, {
      priority: TaskPriority.URGENT,
      dueDate: new Date('2026-08-01'),
    });

    // Add comment and attachment to trigger logs
    await CollaborationService.addComment(user.id, task.id, 'Comment trigger');
    await CollaborationService.addAttachment(user.id, task.id, {
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storagePath: '/uploads/doc.pdf',
    });

    // Fetch details and assert timeline history
    const taskDetails = await CollaborationService.getTodoById(user.id, task.id);
    const actions = taskDetails.histories.map((h) => h.action);

    expect(actions).toContain('TASK_CREATED');
    expect(actions).toContain('PRIORITY_CHANGED');
    expect(actions).toContain('DUE_DATE_CHANGED');
    expect(actions).toContain('COMMENT_ADDED');
    expect(actions).toContain('ATTACHMENT_UPLOADED');
  });
});
