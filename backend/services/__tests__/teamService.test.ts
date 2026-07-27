import { describe, expect, it, beforeEach } from 'vitest'
import { Role, InviteStatus } from '../../prisma/client'
import prisma from '../../database/client'
import { CollaborationService } from '../collaborationService'
import { AuthService } from '../authService'

describe('CollaborationService Integration Tests', () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany({})
    await prisma.teamInvite.deleteMany({})
    await prisma.teamMember.deleteMany({})
    await prisma.team.deleteMany({})
    await prisma.user.deleteMany({})
  })

  it('runs complete team collaboration workflow and team deletion tests', async () => {
    // 1. Create test users
    const userA = await AuthService.register('usera_s3@example.com', 'password123', 'User A (Owner)')
    const userB = await AuthService.register('userb_s3@example.com', 'password123', 'User B')
    const userC = await AuthService.register('userc_s3@example.com', 'password123', 'User C')

    // 2. User A creates team
    const team = await CollaborationService.createTeam(userA.id, 'Engineering')
    if (!team) throw new Error('Team creation failed')
    expect(team).toBeDefined()
    expect(team.ownerId).toBe(userA.id)

    const membersOfTeam = await prisma.teamMember.findMany({ where: { teamId: team.id } })
    expect(membersOfTeam.length).toBe(1)
    expect(membersOfTeam[0].userId).toBe(userA.id)
    expect(membersOfTeam[0].role).toBe(Role.OWNER)

    // 3. User A invites User B
    const inviteB = await CollaborationService.inviteMember(userA.id, team.id, userB.email)
    expect(inviteB.token).toBeDefined()
    expect(inviteB.status).toBe(InviteStatus.PENDING)

    // 4. User B accepts invite
    const acceptResultB = await CollaborationService.acceptInvitation(userB.id, inviteB.token)
    expect(acceptResultB.teamMember?.role).toBe(Role.MEMBER)

    // 5. User B (MEMBER) attempts to promote/demote User A -> expects 403 rejection
    await expect(
      CollaborationService.updateTeamRole(userB.id, team.id, userA.id, Role.MEMBER)
    ).rejects.toThrow()

    // 6. User A promotes User B to ADMIN
    const updatedMemberB = await CollaborationService.updateTeamRole(userA.id, team.id, userB.id, Role.ADMIN)
    expect(updatedMemberB.role).toBe(Role.ADMIN)

    // 7. User B (ADMIN) invites User C
    const inviteC = await CollaborationService.inviteMember(userB.id, team.id, userC.email)
    expect(inviteC.status).toBe(InviteStatus.PENDING)

    // User C accepts
    await CollaborationService.acceptInvitation(userC.id, inviteC.token)

    // 8. Todo Shared vs Private isolation
    const sharedTodo1 = await CollaborationService.createTodo(userA.id, {
      title: 'Shared Task 1 by A',
      description: 'System design doc',
      teamId: team.id,
    })
    expect(sharedTodo1.teamId).toBe(team.id)

    const privateTodoA = await CollaborationService.createTodo(userA.id, {
      title: 'Private Task by A',
      description: 'Personal notes',
    })
    expect(privateTodoA.teamId).toBeNull()

    // User B views team todos
    const teamTodosForB = await CollaborationService.getTodos(userB.id, { teamId: team.id })
    expect(teamTodosForB.some((t) => t.id === sharedTodo1.id)).toBe(true)

    // User B updates shared todo
    const updatedShared = await CollaborationService.updateTodo(userB.id, sharedTodo1.id, { completed: true })
    expect(updatedShared.completed).toBe(true)

    // User B attempts to view User A private todo -> not in list
    const privateTodosForB = await CollaborationService.getTodos(userB.id, {})
    expect(privateTodosForB.some((t) => t.id === privateTodoA.id)).toBe(false)

    // Direct access to private todo should return 404
    await expect(CollaborationService.getTodoById(userB.id, privateTodoA.id)).rejects.toThrow()

    // 9. Multi-user, multi-todo non-destructive team deletion
    const sharedTodo2 = await CollaborationService.createTodo(userB.id, {
      title: 'Shared Task 2 by B',
      teamId: team.id,
    })
    const sharedTodo3 = await CollaborationService.createTodo(userC.id, {
      title: 'Shared Task 3 by C',
      teamId: team.id,
    })

    const todosBeforeDelete = await prisma.todo.findMany({ where: { teamId: team.id } })
    expect(todosBeforeDelete.length).toBe(3)

    // User A (OWNER) deletes team
    await CollaborationService.deleteTeam(userA.id, team.id)

    // Assert team is gone
    const teamAfter = await prisma.team.findUnique({ where: { id: team.id } })
    expect(teamAfter).toBeNull()

    // Assert members & invites for team are deleted
    const membersAfter = await prisma.teamMember.findMany({ where: { teamId: team.id } })
    const invitesAfter = await prisma.teamInvite.findMany({ where: { teamId: team.id } })
    expect(membersAfter.length).toBe(0)
    expect(invitesAfter.length).toBe(0)

    // Assert former shared todos still exist with teamId === null under original creators
    const todo1After = await prisma.todo.findUnique({ where: { id: sharedTodo1.id } })
    const todo2After = await prisma.todo.findUnique({ where: { id: sharedTodo2.id } })
    const todo3After = await prisma.todo.findUnique({ where: { id: sharedTodo3.id } })

    expect(todo1After?.teamId).toBeNull()
    expect(todo1After?.userId).toBe(userA.id)
    expect(todo2After?.teamId).toBeNull()
    expect(todo2After?.userId).toBe(userB.id)
    expect(todo3After?.teamId).toBeNull()
    expect(todo3After?.userId).toBe(userC.id)
  })

  it('fetches invitation details successfully', async () => {
    const userA = await AuthService.register('usera_details@example.com', 'password123', 'User A')
    const team = await CollaborationService.createTeam(userA.id, 'Engineering', 'Eng Description', 'Eng Purpose')
    const invite = await CollaborationService.inviteMember(userA.id, team!.id, 'invited@example.com')
    
    const details = await CollaborationService.getInviteDetails(invite.token)
    expect(details.teamName).toBe('Engineering')
    expect(details.description).toBe('Eng Description')
    expect(details.purpose).toBe('Eng Purpose')
    expect(details.ownerName).toBe('User A')
    expect(details.status).toBe(InviteStatus.PENDING)
  })

  it('rejects invitation successfully', async () => {
    const userA = await AuthService.register('usera_reject@example.com', 'password123', 'User A')
    const userB = await AuthService.register('userb_reject@example.com', 'password123', 'User B')
    const team = await CollaborationService.createTeam(userA.id, 'Engineering')
    const invite = await CollaborationService.inviteMember(userA.id, team!.id, userB.email)
    
    const rejectResult = await CollaborationService.rejectInvitation(userB.id, invite.token)
    expect(rejectResult.message).toBe('Invite declined successfully')
    
    const updatedInvite = await prisma.teamInvite.findUnique({ where: { token: invite.token } })
    expect(updatedInvite?.status).toBe(InviteStatus.REJECTED)
  })

  it('handles task assignment and validates team membership', async () => {
    const userA = await AuthService.register('usera_assign@example.com', 'password123', 'User A')
    const userB = await AuthService.register('userb_assign@example.com', 'password123', 'User B')
    const team = await CollaborationService.createTeam(userA.id, 'Engineering')
    
    // Assigning a task to User B (not yet a team member) should throw
    await expect(
      CollaborationService.createTodo(userA.id, {
        title: 'Task 1',
        teamId: team!.id,
        assignedUserId: userB.id,
      })
    ).rejects.toThrow()

    // Add User B to team
    const invite = await CollaborationService.inviteMember(userA.id, team!.id, userB.email)
    await CollaborationService.acceptInvitation(userB.id, invite.token)

    // Now assigning task to User B should succeed
    const assignedTodo = await CollaborationService.createTodo(userA.id, {
      title: 'Task 1',
      teamId: team!.id,
      assignedUserId: userB.id,
    })
    expect(assignedTodo.assignedToUserId).toBe(userB.id)

    // Assigning personal task to User B should throw
    await expect(
      CollaborationService.createTodo(userA.id, {
        title: 'Private Task',
        assignedUserId: userB.id,
      })
    ).rejects.toThrow()
  })
})
