import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  changePassword,
  createTodo,
  deleteAccount,
  deleteTodo,
  fetchAccountSettings,
  fetchTodos,
  getProfile,
  login,
  register,
  updateAccountSettings,
  updateProfile,
  updateTodo,
} from './api'
import type { AccountSettings, AuthMode, ProfileData, Todo, User } from './types'

const emptyForm = { title: '', description: '' }

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoForm, setTodoForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [todoLoading, setTodoLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [statusMessage, setStatusMessage] = useState('')
  const [activeView, setActiveView] = useState<'tasks' | 'account'>('tasks')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', phoneNumber: '', avatarUrl: '' })
  const [settingsForm, setSettingsForm] = useState({
    theme: 'system' as AccountSettings['theme'],
    notifications: true,
    emailAlerts: true,
    language: 'en',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [deletePassword, setDeletePassword] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    const storedToken = localStorage.getItem('authToken')

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser) as User
      setUser(parsedUser)
      void loadTodos()
    }
  }, [])

  async function loadTodos() {
    setTodoLoading(true)
    try {
      const data = await fetchTodos(
        filter === 'completed' ? true : filter === 'active' ? false : undefined,
        query || undefined,
      )
      setTodos(data)
      setStatusMessage('')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setTodoLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void loadTodos()
    }
  }, [filter, query, user])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setAccountError('')
      setAccountMessage('')
      return
    }

    void loadAccountData()
  }, [user])

  async function loadAccountData() {
    setAccountLoading(true)
    setAccountError('')
    setAccountMessage('')

    try {
      const [profileResult, settingsResult] = await Promise.all([getProfile(), fetchAccountSettings()])

      setProfile(profileResult)
      setProfileForm({
        name: profileResult.name ?? user?.name ?? '',
        bio: profileResult.bio ?? '',
        phoneNumber: profileResult.phoneNumber ?? '',
        avatarUrl: profileResult.avatarUrl ?? '',
      })

      setSettingsForm({
        theme: settingsResult.theme ?? 'system',
        notifications: settingsResult.notifications ?? true,
        emailAlerts: settingsResult.emailAlerts ?? true,
        language: settingsResult.language ?? 'en',
      })
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to load account details right now.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')

    try {
      if (authMode === 'register') {
        await register(authForm.email, authForm.password, authForm.name)
        const response = await login(authForm.email, authForm.password)
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('authUser', JSON.stringify(response.user))
        setUser(response.user)
        setActiveView('tasks')
        setStatusMessage('Account created successfully')
        setAuthForm({ email: '', password: '', name: '' })
      } else {
        const response = await login(authForm.email, authForm.password)
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('authUser', JSON.stringify(response.user))
        setUser(response.user)
        setActiveView('tasks')
        setStatusMessage('Welcome back!')
        setAuthForm({ email: '', password: '', name: '' })
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleTodoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!todoForm.title.trim()) {
      setStatusMessage('Please add a title for your todo.')
      return
    }

    setTodoLoading(true)
    try {
      const created = await createTodo(todoForm.title.trim(), todoForm.description.trim())
      setTodos((current) => [created, ...current])
      setTodoForm(emptyForm)
      setStatusMessage('Todo created successfully')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create todo')
    } finally {
      setTodoLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed })
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)))
      setStatusMessage('Todo updated')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update todo')
    }
  }

  async function removeTodo(id: string) {
    try {
      await deleteTodo(id)
      setTodos((current) => current.filter((todo) => todo.id !== id))
      setStatusMessage('Todo removed')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete todo')
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountLoading(true)
    setAccountError('')
    setAccountMessage('')

    const nextProfile = {
      name: profileForm.name.trim() || user?.name || 'Account member',
      bio: profileForm.bio.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
      avatarUrl: profileForm.avatarUrl.trim(),
    }

    try {
      const updated = await updateProfile(nextProfile)
      setProfile(updated)
      if (user) {
        const updatedUser = { ...user, name: updated.name, email: updated.email || user.email }
        setUser(updatedUser)
        localStorage.setItem('authUser', JSON.stringify(updatedUser))
      }
      setAccountMessage('Profile updated successfully.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Profile update could not be saved.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountLoading(true)
    setAccountError('')
    setAccountMessage('')

    const nextSettings = {
      theme: settingsForm.theme,
      notifications: settingsForm.notifications,
      emailAlerts: settingsForm.emailAlerts,
      language: settingsForm.language,
    }

    try {
      const updated = await updateAccountSettings(nextSettings)
      setSettingsForm({
        theme: updated.theme ?? 'system',
        notifications: updated.notifications ?? true,
        emailAlerts: updated.emailAlerts ?? true,
        language: updated.language ?? 'en',
      })
      setAccountMessage('Preferences saved.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Preferences could not be saved.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountLoading(true)
    setAccountError('')
    setAccountMessage('')

    if (passwordForm.newPassword.length < 6) {
      setAccountError('Use at least 6 characters for the new password.')
      setAccountLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAccountError('The confirmation password must match the new password.')
      setAccountLoading(false)
      return
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setAccountMessage('Password updated successfully.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Password change could not be completed.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function confirmDeleteAccount() {
    setDeletingAccount(true)
    setAccountError('')
    setAccountMessage('')

    try {
      await deleteAccount(deletePassword || undefined)
      logout()
      setShowDeleteModal(false)
      setDeletePassword('')
      setStatusMessage('Account deleted')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Account deletion could not be completed.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos])

  function logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setUser(null)
    setTodos([])
    setTodoForm(emptyForm)
    setActiveView('tasks')
    setProfile(null)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setAccountError('')
    setAccountMessage('')
    setShowDeleteModal(false)
    setStatusMessage('Signed out')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Frontend product</p>
          <h1>Stay on top of every task</h1>
          <p className="hero-copy">
            A polished todo workspace for managing auth, creating tasks, filtering progress, and keeping the experience responsive.
          </p>
        </div>
        <div className="hero-card">
          <h2>{user ? `Welcome, ${user.name}` : 'Secure access'}</h2>
          <p>{user ? 'Your todo board is ready for the next task.' : 'Login or create an account to begin.'}</p>
          {!user ? (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
              </div>
              {authMode === 'register' && (
                <div className="field-group">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  />
                </div>
              )}
              {authError ? <p className="error-text">{authError}</p> : null}
              <button type="submit" disabled={loading}>
                {loading ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                }}
              >
                {authMode === 'login' ? 'Need an account?' : 'Back to login'}
              </button>
            </form>
          ) : (
            <div className="user-actions">
              <div className="view-switcher">
                <button
                  type="button"
                  className={activeView === 'tasks' ? 'active' : 'secondary'}
                  onClick={() => setActiveView('tasks')}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  className={activeView === 'account' ? 'active' : 'secondary'}
                  onClick={() => setActiveView('account')}
                >
                  Account
                </button>
              </div>
              <button type="button" className="secondary" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </header>

      {user ? (
        <main className="content-grid">
          {activeView === 'tasks' ? (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Todo workspace</p>
                    <h2>Create and organize</h2>
                  </div>
                  <div className="pill">{completedCount}/{todos.length} done</div>
                </div>
                <form className="todo-form" onSubmit={handleTodoSubmit}>
                  <div className="field-group">
                    <label htmlFor="title">Title</label>
                    <input
                      id="title"
                      value={todoForm.title}
                      onChange={(event) => setTodoForm({ ...todoForm, title: event.target.value })}
                      placeholder="Finish dashboard polish"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      value={todoForm.description}
                      onChange={(event) => setTodoForm({ ...todoForm, description: event.target.value })}
                      placeholder="Add details for this task"
                      rows={4}
                    />
                  </div>
                  <button type="submit" disabled={todoLoading}>
                    {todoLoading ? 'Saving…' : 'Add todo'}
                  </button>
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Today’s progress</p>
                    <h2>Task list</h2>
                  </div>
                  <div className="filters">
                    <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
                    <button type="button" className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button>
                    <button type="button" className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
                  </div>
                </div>
                <div className="search-box">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search todos" />
                </div>
                {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
                {todoLoading ? <p className="status-text">Loading tasks…</p> : null}
                <ul className="todo-list">
                  {todos.map((todo) => (
                    <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                      <label className="todo-main">
                        <input type="checkbox" checked={todo.completed} onChange={() => void toggleTodo(todo)} />
                        <div>
                          <strong>{todo.title}</strong>
                          {todo.description ? <p>{todo.description}</p> : null}
                        </div>
                      </label>
                      <button type="button" className="delete" onClick={() => void removeTodo(todo.id)}>Remove</button>
                    </li>
                  ))}
                  {!todoLoading && todos.length === 0 ? <li className="empty-state">No todos match this view yet.</li> : null}
                </ul>
              </section>
            </>
          ) : (
            <section className="panel account-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Account workspace</p>
                  <h2>Profile & settings</h2>
                </div>
                <div className="pill">{accountLoading ? 'Syncing…' : 'Secure profile'}</div>
              </div>

              {accountError ? <p className="error-text account-banner">{accountError}</p> : null}
              {accountMessage ? <p className="status-text account-banner">{accountMessage}</p> : null}

              {profile ? (
                <div className="profile-card">
                  <div className="avatar">{getInitials(profile.name || user.name)}</div>
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
                    <label htmlFor="avatarUrl">Profile image URL</label>
                    <input
                      id="avatarUrl"
                      value={profileForm.avatarUrl}
                      onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })}
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  <button type="submit" disabled={accountLoading}>
                    {accountLoading ? 'Saving…' : 'Save profile'}
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
                  <button type="submit" disabled={accountLoading}>
                    {accountLoading ? 'Saving…' : 'Save preferences'}
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
                  <button type="submit" disabled={accountLoading}>
                    {accountLoading ? 'Updating…' : 'Update password'}
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
                      <button type="button" className="secondary" onClick={() => { setShowDeleteModal(false); setDeletePassword('') }}>
                        Cancel
                      </button>
                      <button type="button" className="delete" disabled={deletingAccount} onClick={() => void confirmDeleteAccount()}>
                        {deletingAccount ? 'Deleting…' : 'Delete account'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </main>
      ) : null}
    </div>
  )
}

export default App
