import { PrismaClient, Role, InviteStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { TeamService } from './services/teamService';
import { TodoService } from './services/todoService';
import { AuthService } from './services/authService';
import { AppError } from './middleware/errorHandler';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('===================================================');
  console.log('  Sprint 3 Backend Verification — Teams & Shared  ');
  console.log('===================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, description: string) {
    totalTests++;
    if (condition) {
      console.log(`  [OK] ${description}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${description}`);
    }
  }

  try {
    // 0. Clean test environment
    console.log('--> Cleaning existing test data...');
    await prisma.todo.deleteMany({});
    await prisma.teamInvite.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: ['usera_s3@example.com', 'userb_s3@example.com', 'userc_s3@example.com'] },
      },
    });

    // 1. Create 3 test users
    console.log('--> Creating 3 test users (User A, User B, User C)...');
    const userA = await prisma.user.create({
      data: {
        email: 'usera_s3@example.com',
        name: 'User A (Owner)',
        password: await bcrypt.hash('password123', 10),
      },
    });

    const userB = await prisma.user.create({
      data: {
        email: 'userb_s3@example.com',
        name: 'User B (Member/Admin)',
        password: await bcrypt.hash('password123', 10),
      },
    });

    const userC = await prisma.user.create({
      data: {
        email: 'userc_s3@example.com',
        name: 'User C (Invitee)',
        password: await bcrypt.hash('password123', 10),
      },
    });

    assert(Boolean(userA.id && userB.id && userC.id), 'Test users A, B, C created successfully');

    // 2. User A creates team, becomes OWNER
    console.log('\n--> User A creates Team "Engineering"...');
    const team = await TeamService.createTeam(userA.id, 'Engineering');
    assert(Boolean(team && team.id && team.ownerId === userA.id), 'Team created with User A as ownerId');

    const membersOfTeamA = await prisma.teamMember.findMany({ where: { teamId: team!.id } });
    assert(
      membersOfTeamA.length === 1 &&
        membersOfTeamA[0].userId === userA.id &&
        membersOfTeamA[0].role === Role.OWNER,
      'User A auto-assigned OWNER role in TeamMember table'
    );

    // 3. User A invites User B
    console.log('\n--> User A invites User B...');
    const inviteB = await TeamService.inviteMember(userA.id, team!.id, userB.email);
    assert(
      Boolean(inviteB && inviteB.token && inviteB.status === InviteStatus.PENDING),
      'Pending invite generated with secure token'
    );

    // 4. User B accepts invite
    console.log('\n--> User B accepts invite...');
    const acceptResultB = await TeamService.acceptInvite(userB.id, inviteB.token);
    assert(
      acceptResultB.teamMember?.role === Role.MEMBER,
      'User B joined team with MEMBER role'
    );

    // 5. User B (MEMBER) attempts restricted role change -> expects rejection
    console.log('\n--> User B (MEMBER) attempts to update User A role...');
    let memberRoleChangeError: any = null;
    try {
      await TeamService.updateTeamRole(userB.id, team!.id, userA.id, Role.MEMBER);
    } catch (err: any) {
      memberRoleChangeError = err;
    }
    assert(
      memberRoleChangeError && memberRoleChangeError.statusCode === 403,
      'User B (MEMBER) role change attempt rejected with 403 INSUFFICIENT_ROLE'
    );

    // 6. User A promotes User B to ADMIN
    console.log('\n--> User A promotes User B to ADMIN...');
    const updatedMemberB = await TeamService.updateTeamRole(userA.id, team!.id, userB.id, Role.ADMIN);
    assert(updatedMemberB.role === Role.ADMIN, 'User B promoted to ADMIN by User A');

    // 7. User B (ADMIN) invites User C -> expects success
    console.log('\n--> User B (ADMIN) invites User C...');
    const inviteC = await TeamService.inviteMember(userB.id, team!.id, userC.email);
    assert(Boolean(inviteC && inviteC.status === InviteStatus.PENDING), 'User B (ADMIN) successfully invited User C');

    // User C accepts invite
    await TeamService.acceptInvite(userC.id, inviteC.token);

    // 8. Todo Shared vs Private isolation
    console.log('\n--> Testing Shared vs Private todo isolation...');
    const sharedTodo1 = await TodoService.createTodo(userA.id, {
      title: 'Shared Task 1 by A',
      description: 'System design doc',
      teamId: team!.id,
    });
    assert(sharedTodo1.teamId === team!.id, 'Shared todo created under Team ID');

    const privateTodoA = await TodoService.createTodo(userA.id, {
      title: 'Private Task by A',
      description: 'Personal notes',
    });
    assert(privateTodoA.teamId === null, 'Private todo created with teamId = null');

    // User B views team todos
    const teamTodosForB = await TodoService.getTodos(userB.id, { teamId: team!.id });
    assert(
      teamTodosForB.some((t) => t.id === sharedTodo1.id),
      'User B can view shared team todo created by User A'
    );

    // User B updates shared todo
    const updatedShared = await TodoService.updateTodo(userB.id, sharedTodo1.id, { completed: true });
    assert(updatedShared.completed === true, 'User B (team member) can update shared team todo');

    // User B attempts to view User A private todo -> expects rejection/not found
    const privateTodosForB = await TodoService.getTodos(userB.id, {});
    assert(
      !privateTodosForB.some((t) => t.id === privateTodoA.id),
      'User A private todo is NOT visible in User B private todo list'
    );

    let getPrivateTodoError: any = null;
    try {
      await TodoService.getTodoById(userB.id, privateTodoA.id);
    } catch (err: any) {
      getPrivateTodoError = err;
    }
    assert(
      getPrivateTodoError && getPrivateTodoError.statusCode === 404,
      'User B fetching User A private todo directly returns 404'
    );

    // 9. Multi-user, multi-todo non-destructive team deletion
    console.log('\n--> Testing Multi-User Multi-Todo Non-Destructive Team Deletion...');
    const sharedTodo2 = await TodoService.createTodo(userB.id, {
      title: 'Shared Task 2 by B',
      description: 'Frontend components',
      teamId: team!.id,
    });

    const sharedTodo3 = await TodoService.createTodo(userC.id, {
      title: 'Shared Task 3 by C',
      description: 'API Integration',
      teamId: team!.id,
    });

    // Verify 3 todos currently attached to team
    const todosBeforeDelete = await prisma.todo.findMany({ where: { teamId: team!.id } });
    assert(todosBeforeDelete.length === 3, '3 shared todos attached to Team before deletion');

    // User A (OWNER) deletes team
    console.log('  Deleting team via User A...');
    await TeamService.deleteTeam(userA.id, team!.id);

    // Assert team is gone
    const teamAfter = await prisma.team.findUnique({ where: { id: team!.id } });
    assert(teamAfter === null, 'Team record removed from database');

    // Assert members & invites for team are gone
    const membersAfter = await prisma.teamMember.findMany({ where: { teamId: team!.id } });
    const invitesAfter = await prisma.teamInvite.findMany({ where: { teamId: team!.id } });
    assert(membersAfter.length === 0 && invitesAfter.length === 0, 'TeamMember and TeamInvite rows removed');

    // Assert former shared todos still exist, teamId === null, creator unchanged
    const todo1After = await prisma.todo.findUnique({ where: { id: sharedTodo1.id } });
    const todo2After = await prisma.todo.findUnique({ where: { id: sharedTodo2.id } });
    const todo3After = await prisma.todo.findUnique({ where: { id: sharedTodo3.id } });

    assert(
      Boolean(
        todo1After &&
          todo1After.teamId === null &&
          todo1After.userId === userA.id &&
          todo2After &&
          todo2After.teamId === null &&
          todo2After.userId === userB.id &&
          todo3After &&
          todo3After.teamId === null &&
          todo3After.userId === userC.id
      ),
      'All 3 former shared todos detached (teamId = null) and preserved under original creators (non-destructive)'
    );

    console.log('\n===================================================');
    console.log(`  Verification Summary: ${passedTests}/${totalTests} Passed`);
    console.log('===================================================\n');

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n[FATAL ERROR during verification]:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
