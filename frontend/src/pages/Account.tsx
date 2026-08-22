import { type FormEvent, useState } from 'react'
import type { AccountSettings, ProfileData, User } from '../types'
import { Avatar } from '../components/shared/Avatar'
import { updateProfile, updateAccountSettings, changePassword, deleteAccount } from '../api'

interface AccountProps {
  user: User
  setUser: (val: User | null) => void
  onLogout: () => void
  profile: ProfileData | null
  setProfile: (val: ProfileData | null) => void
  profileForm: { name: string; bio: string; phoneNumber: string; avatarUrl: string }
  setProfileForm: (val: { name: string; bio: string; phoneNumber: string; avatarUrl: string } | ((prev: { name: string; bio: string; phoneNumber: string; avatarUrl: string }) => { name: string; bio: string; phoneNumber: string; avatarUrl: string })) => void
  settingsForm: {
    theme: AccountSettings['theme']
    notifications: boolean
    emailAlerts: boolean
    language: string
  }
  setSettingsForm: (val: { theme: AccountSettings['theme']; notifications: boolean; emailAlerts: boolean; language: string } | ((prev: { theme: AccountSettings['theme']; notifications: boolean; emailAlerts: boolean; language: string }) => { theme: AccountSettings['theme']; notifications: boolean; emailAlerts: boolean; language: string })) => void
  passwordForm: { currentPassword: string; newPassword: string; confirmPassword: string }
  setPasswordForm: (val: { currentPassword: string; newPassword: string; confirmPassword: string } | ((prev: { currentPassword: string; newPassword: string; confirmPassword: string }) => { currentPassword: string; newPassword: string; confirmPassword: string })) => void
  accountError: string
  setAccountError: (val: string) => void
  accountMessage: string
  setAccountMessage: (val: string) => void
  accountSyncLoading: boolean
  saveProfileLoading: boolean
  setSaveProfileLoading: (val: boolean) => void
  saveSettingsLoading: boolean
  setSaveSettingsLoading: (val: boolean) => void
  changePasswordLoading: boolean
  setChangePasswordLoading: (val: boolean) => void
  applyTheme: (theme: AccountSettings['theme']) => void
}

export function Account({
  user,
  setUser,
  onLogout,
  profile,
  setProfile,
  profileForm,
  setProfileForm,
  settingsForm,
  setSettingsForm,
  passwordForm,
  setPasswordForm,
  accountError,
  setAccountError,
  accountMessage,
  setAccountMessage,
  accountSyncLoading,
  saveProfileLoading,
  setSaveProfileLoading,
  saveSettingsLoading,
  setSaveSettingsLoading,
  changePasswordLoading,
  setChangePasswordLoading,
  applyTheme,
}: AccountProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileForm((prev) => ({
        ...prev,
        avatarUrl: reader.result as string
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveProfileLoading(true)
    setAccountError('')
    setAccountMessage('')

    const nextProfile = {
      name: profileForm.name.trim() || user.name || 'Account member',
      bio: profileForm.bio.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
      avatarUrl: profileForm.avatarUrl.trim(),
    }

    try {
      const updated = await updateProfile(nextProfile)
      setProfile(updated)
      const updatedUser = {
        ...user,
        name: updated.name,
        email: updated.email || user.email,
        avatarUrl: updated.avatarUrl,
      }
      setUser(updatedUser)
      localStorage.setItem('authUser', JSON.stringify(updatedUser))
      setAccountMessage('Profile updated successfully.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Profile update could not be saved.')
    } finally {
      setSaveProfileLoading(false)
    }
  }

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveSettingsLoading(true)
    setAccountError('')
    setAccountMessage('')

    try {
      const updated = await updateAccountSettings(settingsForm)
      const newTheme = updated.theme ?? 'system'
      setSettingsForm({
        theme: newTheme,
        notifications: updated.notifications ?? true,
        emailAlerts: updated.emailAlerts ?? true,
        language: updated.language ?? 'en',
      })
      applyTheme(newTheme)
      setAccountMessage('Preferences saved.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Preferences could not be saved.')
    } finally {
      setSaveSettingsLoading(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setChangePasswordLoading(true)
    setAccountError('')
    setAccountMessage('')

    if (passwordForm.newPassword.length < 6) {
      setAccountError('Use at least 6 characters for the new password.')
      setChangePasswordLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAccountError('The confirmation password must match the new password.')
      setChangePasswordLoading(false)
      return
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setAccountMessage('Password updated successfully.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Password change could not be completed.')
    } finally {
      setChangePasswordLoading(false)
    }
  }

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true)
    setAccountError('')
    setAccountMessage('')

    try {
      await deleteAccount(deletePassword || undefined)
      onLogout()
      setShowDeleteModal(false)
      setDeletePassword('')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Account deletion could not be completed.')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <section className="panel account-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Account workspace</p>
          <h2>Profile & settings</h2>
        </div>
        <div className="pill">{accountSyncLoading ? 'Syncing…' : 'Secure profile'}</div>
      </div>

      {accountError ? <p className="error-text account-banner">{accountError}</p> : null}
      {accountMessage ? <p className="status-text account-banner">{accountMessage}</p> : null}

      {profile ? (
        <div className="profile-card">
          <Avatar src={profile.avatarUrl || user.avatarUrl} name={profile.name || user.name} size={56} />
          <div>
            <h3>{profile.name || user.name}</h3>
            <p>{profile.email || user.email}</p>
            <p>{profile.bio || 'Tell others a bit about yourself.'}</p>
          </div>
        </div>
      ) : null}

      <div className="account-section">
        <h3>Edit profile</h3>
        <form className="auth-form" onSubmit={handleProfileSubmit}>
          <div className="field-group">
            <label htmlFor="profileName">Display name</label>
            <input
              id="profileName"
              value={profileForm.name}
              onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              rows={3}
              value={profileForm.bio}
              onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber"
              value={profileForm.phoneNumber}
              onChange={(event) => setProfileForm({ ...profileForm, phoneNumber: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="avatarFile">Profile Image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <input
                id="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--divider)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: 'var(--text-foreground)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              />
            </div>
            {profileForm.avatarUrl && !profileForm.avatarUrl.startsWith('data:') && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Current path: {profileForm.avatarUrl}
              </p>
            )}
          </div>
          <button type="submit" disabled={saveProfileLoading}>
            {saveProfileLoading ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>

      <div className="account-section">
        <h3>Preferences</h3>
        <form className="auth-form" onSubmit={handleSettingsSubmit}>
          <div className="field-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={settingsForm.theme}
              onChange={(event) => setSettingsForm({ ...settingsForm, theme: event.target.value as AccountSettings['theme'] })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="field-group checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={settingsForm.notifications}
                onChange={(event) => setSettingsForm({ ...settingsForm, notifications: event.target.checked })}
              />
              Notifications
            </label>
          </div>
          <div className="field-group checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={settingsForm.emailAlerts}
                onChange={(event) => setSettingsForm({ ...settingsForm, emailAlerts: event.target.checked })}
              />
              Email alerts
            </label>
          </div>
          <div className="field-group">
            <label htmlFor="language">Language</label>
            <input
              id="language"
              value={settingsForm.language}
              onChange={(event) => setSettingsForm({ ...settingsForm, language: event.target.value })}
            />
          </div>
          <button type="submit" disabled={saveSettingsLoading}>
            {saveSettingsLoading ? 'Saving…' : 'Save preferences'}
          </button>
        </form>
      </div>

      <div className="account-section">
        <h3>Change password</h3>
        <form className="auth-form" onSubmit={handlePasswordSubmit}>
          <div className="field-group">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
            />
          </div>
          <button type="submit" disabled={changePasswordLoading}>
            {changePasswordLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="account-section danger-card">
        <h3>Delete account</h3>
        <p>This action is permanent and removes your current workspace profile.</p>
        <button type="button" className="delete" onClick={() => setShowDeleteModal(true)}>
          Delete account
        </button>
      </div>

      {showDeleteModal ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Delete this account?</h3>
            <p>This will remove your personal workspace access and sign you out immediately.</p>
            <div className="field-group">
              <label htmlFor="deletePassword">Confirm Password (optional)</label>
              <input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Enter your password to confirm"
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete"
                disabled={deletingAccount}
                onClick={() => void confirmDeleteAccount()}
              >
                {deletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
export default Account
