import { describe, expect, it, beforeEach } from 'vitest'
import prisma from '../../database/client'
import { AuthService } from '../authService'

describe('AuthService', () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany({})
    await prisma.teamInvite.deleteMany({})
    await prisma.teamMember.deleteMany({})
    await prisma.team.deleteMany({})
    await prisma.user.deleteMany({})
  })

  it('registers a user successfully and Normalized email', async () => {
    const user = await AuthService.register('Test@Example.com', 'password123', 'Test User')
    expect(user.id).toBeDefined()
    expect(user.email).toBe('test@example.com')
    expect(user.name).toBe('Test User')

    // Expect password is not returned in select
    expect((user as any).password).toBeUndefined()
  })

  it('rejects duplicate registration email', async () => {
    await AuthService.register('test@example.com', 'password123', 'Test User')
    await expect(
      AuthService.register('test@example.com', 'password456', 'Another User')
    ).rejects.toThrow('User with this email already exists')
  })

  it('logs in registered user successfully and returns JWT', async () => {
    await AuthService.register('test@example.com', 'password123', 'Test User')
    const result = await AuthService.login('test@example.com', 'password123')
    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('test@example.com')
    expect(result.user.name).toBe('Test User')
  })

  it('rejects incorrect login credentials', async () => {
    await AuthService.register('test@example.com', 'password123', 'Test User')
    await expect(
      AuthService.login('test@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid email or password')

    await expect(
      AuthService.login('nonexistent@example.com', 'password123')
    ).rejects.toThrow('Invalid email or password')
  })
})
