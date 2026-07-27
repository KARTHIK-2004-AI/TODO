import { describe, expect, it, beforeEach } from 'vitest'
import prisma from '../../database/client'
import { UserService } from '../userService'
import { AuthService } from '../authService'

describe('UserService', () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany({})
    await prisma.teamInvite.deleteMany({})
    await prisma.teamMember.deleteMany({})
    await prisma.team.deleteMany({})
    await prisma.user.deleteMany({})
  })

  it('retrieves user profile', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    const profile = await UserService.getProfile(user.id)
    expect(profile.id).toBe(user.id)
    expect(profile.email).toBe('test@example.com')
    expect(profile.bio).toBe('')
  })

  it('updates profile fields', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    const updated = await UserService.updateProfile(user.id, {
      bio: 'New bio content',
      phoneNumber: '555-1234',
    })
    expect(updated.bio).toBe('New bio content')
    expect(updated.phoneNumber).toBe('555-1234')

    const profile = await UserService.getProfile(user.id)
    expect(profile.bio).toBe('New bio content')
  })

  it('changes password with valid current password', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    await UserService.changePassword(user.id, 'password123', 'newpassword123')

    // Login with new password should succeed
    const loginResult = await AuthService.login('test@example.com', 'newpassword123')
    expect(loginResult.token).toBeDefined()
  })

  it('rejects password change if current password incorrect', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    await expect(
      UserService.changePassword(user.id, 'wrongpassword', 'newpassword123')
    ).rejects.toThrow('Incorrect current password')
  })

  it('retrieves and updates user preferences settings', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    const initialSettings = await UserService.getSettings(user.id)
    expect(initialSettings.theme).toBe('system')

    const updatedSettings = await UserService.updateSettings(user.id, {
      theme: 'dark',
      notifications: false,
    })
    expect(updatedSettings.theme).toBe('dark')
    expect(updatedSettings.notifications).toBe(false)

    const currentSettings = await UserService.getSettings(user.id)
    expect(currentSettings.theme).toBe('dark')
  })

  it('deletes user account', async () => {
    const user = await AuthService.register('test@example.com', 'password123', 'Test User')
    await UserService.deleteAccount(user.id, 'password123')

    await expect(UserService.getProfile(user.id)).rejects.toThrow('User not found')
  })
})
