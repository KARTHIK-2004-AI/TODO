import { describe, expect, it, beforeEach } from 'vitest'
import prisma from '../../database/client'
import { CollaborationService } from '../collaborationService'
import { AuthService } from '../authService'

describe('TaskService via CollaborationService', () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany({})
    await prisma.teamInvite.deleteMany({})
    await prisma.teamMember.deleteMany({})
    await prisma.team.deleteMany({})
    await prisma.user.deleteMany({})
  })

  it('creates and retrieves private todos', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    const todo = await CollaborationService.createTodo(user.id, {
      title: 'Private task',
      description: 'Important notes',
    })
    expect(todo.id).toBeDefined()
    expect(todo.teamId).toBeNull()

    const list = await CollaborationService.getTodos(user.id, {})
    expect(list.length).toBe(1)
    expect(list[0].title).toBe('Private task')
  })

  it('updates and deletes private todos', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    const todo = await CollaborationService.createTodo(user.id, { title: 'Task' })

    const updated = await CollaborationService.updateTodo(user.id, todo.id, { completed: true })
    expect(updated.completed).toBe(true)

    await CollaborationService.deleteTodo(user.id, todo.id)
    const list = await CollaborationService.getTodos(user.id, {})
    expect(list.length).toBe(0)
  })

  it('enforces task ownership on private todos', async () => {
    const userA = await AuthService.register('usera@example.com', 'password123', 'User A')
    const userB = await AuthService.register('userb@example.com', 'password123', 'User B')

    const todoA = await CollaborationService.createTodo(userA.id, { title: 'User A Task' })

    // User B attempts to get, update, or delete User A's private todo
    await expect(CollaborationService.getTodoById(userB.id, todoA.id)).rejects.toThrow('Todo not found')
    await expect(CollaborationService.updateTodo(userB.id, todoA.id, { completed: true })).rejects.toThrow('Todo not found')
    await expect(CollaborationService.deleteTodo(userB.id, todoA.id)).rejects.toThrow('Todo not found')
  })
})
