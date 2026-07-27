import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Account } from '../Account'
import type { User, ProfileData } from '../../types'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
}

const mockProfile: ProfileData = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  bio: 'A developer bio',
  phoneNumber: '123-456-7890',
  avatarUrl: '',
  timezone: 'UTC',
}

describe('Account Component', () => {
  it('renders Account profile inputs and Danger Card', () => {
    const mockSetUser = vi.fn()
    const mockOnLogout = vi.fn()
    const mockSetProfile = vi.fn()
    const mockSetProfileForm = vi.fn()
    const mockSetSettingsForm = vi.fn()
    const mockSetPasswordForm = vi.fn()
    const mockSetAccountError = vi.fn()
    const mockSetAccountMessage = vi.fn()
    const mockSetSaveProfileLoading = vi.fn()
    const mockSetSaveSettingsLoading = vi.fn()
    const mockSetChangePasswordLoading = vi.fn()
    const mockApplyTheme = vi.fn()

    render(
      <Account
        user={mockUser}
        setUser={mockSetUser}
        onLogout={mockOnLogout}
        profile={mockProfile}
        setProfile={mockSetProfile}
        profileForm={{ name: 'Test User', bio: 'A developer bio', phoneNumber: '123-456-7890', avatarUrl: '' }}
        setProfileForm={mockSetProfileForm}
        settingsForm={{ theme: 'system', notifications: true, emailAlerts: true, language: 'en' }}
        setSettingsForm={mockSetSettingsForm}
        passwordForm={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
        setPasswordForm={mockSetPasswordForm}
        accountError=""
        setAccountError={mockSetAccountError}
        accountMessage=""
        setAccountMessage={mockSetAccountMessage}
        accountSyncLoading={false}
        saveProfileLoading={false}
        setSaveProfileLoading={mockSetSaveProfileLoading}
        saveSettingsLoading={false}
        setSaveSettingsLoading={mockSetSaveSettingsLoading}
        changePasswordLoading={false}
        setChangePasswordLoading={mockSetChangePasswordLoading}
        applyTheme={mockApplyTheme}
      />
    )

    expect(screen.getByText(/Account workspace/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Delete account/i)[0]).toBeInTheDocument()
  })
})
