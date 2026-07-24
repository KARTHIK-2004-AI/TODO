import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  acceptTeamInvite,
  changePassword,
  createTeam,
  createTodo,
  deleteAccount,
  deleteTeam,
  deleteTodo,
  fetchAccountSettings,
  fetchMyTeams,
  fetchTeamDetails,
  fetchTodos,
  getProfile,
  inviteTeamMember,
  login,
  register,
  removeTeamMember,
  renameTeam,
  revokeTeamInvite,
  updateAccountSettings,
  updateProfile,
  updateTodo,
} from './api'
import type { AccountSettings, AuthMode, ProfileData, Team, TeamMember, TeamRole, Todo, User } from './types'

const emptyForm = { title: '', description: '' }

type WorkspaceSelection = { kind: 'private' } | { kind: 'team'; teamId: string }

type InviteRoute = { kind: 'tasks' | 'account' | 'accept-invite'; token?: string }

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

function getRoleLabel(role: TeamRole) {
  return role === 'OWNER' ? 'Owner' : role === 'ADMIN' ? 'Admin' : 'Member'
}

function canPerformAction(role: TeamRole | undefined, action: 'rename' | 'delete' | 'invite' | 'revoke' | 'remove-member' | 'remove-admin' | 'remove-owner' | 'view' | 'create') {
  if (!role) return action === 'view' || action === 'create'
  const roleMap: Record<TeamRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
  const required = { rename: 3, delete: 3, invite: 2, revoke: 2, 'remove-member': 2, 'remove-admin': 3, 'remove-owner': 3, view: 1, create: 1 }
  return roleMap[role] >= required[action]
}

function applyTheme(theme: 'system' | 'light' | 'dark') {
  let resolvedTheme = theme
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme)
}

function Avatar({ src, name, size = 52 }: { src?: string; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [src])

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid #e2e8f0',
        }}
      />
    )
  }

  return (
    <div className="avatar" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(14, Math.floor(size / 2.5))}px` }}>
      {getInitials(name)}
    </div>
  )
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('authUser')
    const storedToken = localStorage.getItem('authToken')
    if (storedUser && storedToken) {
      try {
        return JSON.parse(storedUser) as User
      } catch {
        return null
      }
    }
    return null
  })
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoForm, setTodoForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [todoLoading, setTodoLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [statusMessage, setStatusMessage] = useState('')
  const [activeView, setActiveView] = useState<'tasks' | 'account'>('tasks')
  const [route, setRoute] = useState<InviteRoute>({ kind: 'tasks' })
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
  const [saveProfileLoading, setSaveProfileLoading] = useState(false)
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false)
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [accountSyncLoading, setAccountSyncLoading] = useState(false)
  const [pendingRevokeInviteId, setPendingRevokeInviteId] = useState<string | null>(null)
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState(false)
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null)
  const [pendingDeleteTodoId, setPendingDeleteTodoId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [workspace, setWorkspace] = useState<WorkspaceSelection>({ kind: 'private' })
  const [teams, setTeams] = useState<Team[]>([])
  const [teamForm, setTeamForm] = useState('')
  const [teamNameEdit, setTeamNameEdit] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamMessage, setTeamMessage] = useState('')
  const [acceptToken, setAcceptToken] = useState('')

  const loadTeams = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    try {
      const data = await fetchMyTeams()
      setTeams(data.map((team) => ({ ...team, invites: team.invites ?? [] })))
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Unable to load teams')
    }
  }, [])

  const loadTodos = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    setTodoLoading(true)
    try {
      const teamId = workspace.kind === 'team' ? workspace.teamId : undefined
      const data = await fetchTodos(
        filter === 'completed' ? true : filter === 'active' ? false : undefined,
        query || undefined,
        teamId,
      )
      setTodos(data)
      setStatusMessage('')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setTodoLoading(false)
    }
  }, [filter, query, workspace])

  const loadAccountData = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    setAccountSyncLoading(true)
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

      const theme = settingsResult.theme ?? 'system'
      setSettingsForm({
        theme,
        notifications: settingsResult.notifications ?? true,
        emailAlerts: settingsResult.emailAlerts ?? true,
        language: settingsResult.language ?? 'en',
      })
      applyTheme(theme)
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Unable to load account details right now.')
    } finally {
      setAccountSyncLoading(false)
    }
  }, [user?.name])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setTodos([])
      setStatusMessage('Session expired. Please log in again.')
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  useEffect(() => {
    const syncRoute = () => {
      const hash = window.location.hash.replace(/^#/, '')
      const [path, queryStr = ''] = hash.split('?')

      if (path === '/accept-invite') {
        const params = new URLSearchParams(queryStr)
        const token = params.get('token') ?? ''
        setRoute({ kind: 'accept-invite', token: token || undefined })
        setAcceptToken(token)
        setActiveView('tasks')
      } else {
        setRoute({ kind: path === '/account' ? 'account' : 'tasks' })
      }
    }

    syncRoute()
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (user) {
      void loadTodos()
      void loadTeams()
      void loadAccountData()
    }
  }, [user, loadTodos, loadTeams, loadAccountData])

  useEffect(() => {
    if (workspace.kind === 'team') {
      fetchTeamDetails(workspace.teamId)
        .then((fullTeam) => {
          setTeams((current) =>
            current.map((t) =>
              t.id === fullTeam.id
                ? {
                    ...t,
                    ...fullTeam,
                    members: fullTeam.members ?? t.members ?? [],
                    invites: fullTeam.invites ?? t.invites ?? [],
                  }
                : t,
            ),
          )
        })
        .catch(() => {
          // ignore or keep cached team data
        })
    }
  }, [workspace])

  const selectedTeam = useMemo(() => {
    if (workspace.kind === 'team') {
      return teams.find((team) => team.id === workspace.teamId) ?? null
    }
    return null
  }, [teams, workspace])

  const currentRole = useMemo(() => {
    if (!user || !selectedTeam) return undefined
    return (selectedTeam.members ?? []).find((member) => member.userId === user.id)?.role ?? selectedTeam.myRole
  }, [selectedTeam, user])

  const visibleTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'active') return !todo.completed
      if (filter === 'completed') return todo.completed
      return true
    })
  }, [todos, filter])

  const completedCount = useMemo(() => visibleTodos.filter((todo) => todo.completed).length, [visibleTodos])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
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

  async function handleTodoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!todoForm.title.trim()) {
      setStatusMessage('Please add a title for your todo.')
      return
    }

    setTodoLoading(true)
    try {
      const teamId = workspace.kind === 'team' ? workspace.teamId : undefined
      const created = await createTodo(todoForm.title.trim(), todoForm.description.trim(), teamId)
      setTodos((current) => [created, ...current])
      setStatusMessage(teamId ? 'Shared todo created successfully' : 'Todo created successfully')
      setTodoForm(emptyForm)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create todo')
    } finally {
      setTodoLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed })
      setTodos((current) =>
        current
          .map((item) => (item.id === todo.id ? updated : item))
          .filter((item) => {
            if (filter === 'active') return !item.completed
            if (filter === 'completed') return item.completed
            return true
          }),
      )
      setStatusMessage('Todo updated')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update todo')
    }
  }

  async function removeTodo(id: string) {
    if (pendingDeleteTodoId === id) return
    setPendingDeleteTodoId(id)
    try {
      await deleteTodo(id)
      setTodos((current) => current.filter((todo) => todo.id !== id))
      setStatusMessage('Todo removed')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete todo')
    } finally {
      setPendingDeleteTodoId(null)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveProfileLoading(true)
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
        const updatedUser = { ...user, name: updated.name, email: updated.email || user.email, avatarUrl: updated.avatarUrl }
        setUser(updatedUser)
        localStorage.setItem('authUser', JSON.stringify(updatedUser))
      }
      setAccountMessage('Profile updated successfully.')
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Profile update could not be saved.')
    } finally {
      setSaveProfileLoading(false)
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveSettingsLoading(true)
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
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

  function logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setUser(null)
    setTodos([])
    setTodoForm(emptyForm)
    setActiveView('tasks')
    setWorkspace({ kind: 'private' })
    setTeams([])
    setProfile(null)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setAccountError('')
    setAccountMessage('')
    setShowDeleteModal(false)
    setStatusMessage('Signed out')
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const trimmed = teamForm.trim()
    if (!trimmed) {
      setTeamError('Please enter a team name.')
      return
    }

    try {
      const createdTeam = await createTeam(trimmed)
      setTeams((current) => [createdTeam, ...current])
      setWorkspace({ kind: 'team', teamId: createdTeam.id })
      setTeamForm('')
      setTeamNameEdit(trimmed)
      setTeamMessage(`Team “${trimmed}” is ready for collaboration.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not create team')
    }
  }

  async function handleRenameTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTeam) return

    if (!canPerformAction(currentRole, 'rename')) {
      setTeamError('Only the team owner can rename this workspace.')
      return
    }

    const trimmed = teamNameEdit.trim()
    if (!trimmed) {
      setTeamError('Please provide a new team name.')
      return
    }

    try {
      const updated = await renameTeam(selectedTeam.id, trimmed)
      setTeams((current) =>
        current.map((team) =>
          team.id === selectedTeam.id
            ? {
                ...team,
                ...updated,
                members: updated.members ?? team.members ?? [],
                invites: updated.invites ?? team.invites ?? [],
              }
            : team,
        ),
      )
      setTeamNameEdit(trimmed)
      setTeamMessage('Team renamed successfully.')
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not rename team')
    }
  }

  async function handleDeleteTeam() {
    if (!selectedTeam || pendingDeleteTeam) return
    if (!canPerformAction(currentRole, 'delete')) {
      setTeamError('Only the owner can delete this team.')
      return
    }

    setPendingDeleteTeam(true)
    try {
      await deleteTeam(selectedTeam.id)
      setTeams((current) => current.filter((team) => team.id !== selectedTeam.id))
      setWorkspace({ kind: 'private' })
      setTeamNameEdit('')
      setTeamMessage(`Team “${selectedTeam.name}” was deleted and its todos reverted to private.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not delete team')
    } finally {
      setPendingDeleteTeam(false)
    }
  }

  async function handleInviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTeam) return
    if (!canPerformAction(currentRole, 'invite')) {
      setTeamError('Only owners and admins can send invites.')
      return
    }

    const trimmed = inviteEmail.trim()
    if (!trimmed) {
      setTeamError('Please provide an email address.')
      return
    }

    try {
      const invite = await inviteTeamMember(selectedTeam.id, trimmed)
      setTeams((current) => current.map((team) => (team.id === selectedTeam.id ? {
        ...team,
        invites: [invite, ...(team.invites ?? [])],
      } : team)))
      setInviteEmail('')
      setTeamMessage(`Invite sent to ${trimmed}.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not send invite')
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!selectedTeam || pendingRevokeInviteId === inviteId) return
    if (!canPerformAction(currentRole, 'revoke')) {
      setTeamError('Only owners and admins can revoke invites.')
      return
    }

    setPendingRevokeInviteId(inviteId)
    try {
      await revokeTeamInvite(selectedTeam.id, inviteId)
      setTeams((current) => current.map((team) => (team.id === selectedTeam.id ? {
        ...team,
        invites: (team.invites ?? []).map((invite) => (invite.id === inviteId ? { ...invite, status: 'REVOKED' } : invite)),
      } : team)))
      setTeamMessage('Invite revoked.')
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not revoke invite')
    } finally {
      setPendingRevokeInviteId(null)
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!selectedTeam || !user || pendingRemoveMemberId === member.id) return

    if (!canPerformAction(currentRole, 'remove-member')) {
      setTeamError('You do not have permission to remove members.')
      return
    }

    if (member.userId === selectedTeam.ownerId) {
      setTeamError('The team owner cannot be removed.')
      return
    }

    if (member.role === 'ADMIN' && currentRole === 'ADMIN') {
      setTeamError('Admins cannot remove other admins.')
      return
    }

    setPendingRemoveMemberId(member.id)
    try {
      await removeTeamMember(selectedTeam.id, member.userId)
      setTeams((current) => current.map((team) => (team.id === selectedTeam.id ? {
        ...team,
        members: (team.members ?? []).filter((entry) => entry.id !== member.id),
      } : team)))
      setTeamMessage(`${member.user?.name ?? member.userId} was removed from the team.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not remove member')
    } finally {
      setPendingRemoveMemberId(null)
    }
  }

  async function handleAcceptInvite() {
    if (!user || !selectedTeam) return
    const invite = (selectedTeam.invites ?? []).find((entry) => entry.token === acceptToken)
    if (!invite) {
      setTeamError('That invite is no longer available.')
      return
    }

    try {
      const result = await acceptTeamInvite(invite.token)
      const currentMembers = selectedTeam.members ?? []
      setTeams((current) => current.map((team) => (team.id === selectedTeam.id ? {
        ...team,
        invites: (team.invites ?? []).filter((entry) => entry.id !== invite.id),
        members: currentMembers.some((member) => member.userId === user.id)
          ? currentMembers
          : [
              ...currentMembers,
              {
                ...result.teamMember,
                user: { ...user, avatarUrl: user.avatarUrl ?? '' },
              },
            ],
      } : team)))
      setWorkspace({ kind: 'team', teamId: selectedTeam.id })
      setRoute({ kind: 'tasks' })
      setAcceptToken('')
      setTeamMessage('Invite accepted. You can now work in this shared workspace.')
      setTeamError('')
      window.location.hash = '#/tasks'
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not accept invite')
    }
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
          <p>{user ? 'Switch between private work and shared team workspaces.' : 'Login or create an account to begin.'}</p>
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
                  onClick={() => {
                    setActiveView('tasks')
                    window.location.hash = '#/tasks'
                  }}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  className={activeView === 'account' ? 'active' : 'secondary'}
                  onClick={() => {
                    setActiveView('account')
                    window.location.hash = '#/account'
                  }}
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
          {route.kind === 'accept-invite' ? (
            <section className="panel invite-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Invite acceptance</p>
                  <h2>Join a shared workspace</h2>
                </div>
              </div>
              <p className="invite-copy">Use the invite token from your email or link to join a team workspace.</p>
              <div className="field-group">
                <label htmlFor="inviteToken">Invite token</label>
                <input id="inviteToken" value={acceptToken} onChange={(event) => setAcceptToken(event.target.value)} />
              </div>
              <button type="button" onClick={handleAcceptInvite}>Accept invite</button>
              {teamError ? <p className="error-text">{teamError}</p> : null}
              {teamMessage ? <p className="status-text">{teamMessage}</p> : null}
            </section>
          ) : null}

          {activeView === 'tasks' && route.kind !== 'accept-invite' ? (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Workspace switcher</p>
                    <h2>Select your context</h2>
                  </div>
                  <div className="pill">{workspace.kind === 'private' ? 'Private' : 'Shared'}</div>
                </div>
                <div className="workspace-switcher">
                  <button type="button" className={workspace.kind === 'private' ? 'active' : 'secondary'} onClick={() => setWorkspace({ kind: 'private' })}>Private</button>
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className={workspace.kind === 'team' && workspace.teamId === team.id ? 'active' : 'secondary'}
                      onClick={() => {
                        setWorkspace({ kind: 'team', teamId: team.id })
                        setTeamNameEdit(team.name)
                      }}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
                <p className="workspace-copy">
                  Private tasks stay personal. Team workspaces show shared todos and role-based actions.
                </p>
                <form className="team-create-form" onSubmit={handleCreateTeam}>
                  <div className="field-group">
                    <label htmlFor="teamName">Create team</label>
                    <input id="teamName" value={teamForm} onChange={(event) => setTeamForm(event.target.value)} placeholder="Operations" />
                  </div>
                  <button type="submit">Create team</button>
                </form>
                {teamError ? <p className="error-text">{teamError}</p> : null}
                {teamMessage ? <p className="status-text">{teamMessage}</p> : null}
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Todo workspace</p>
                    <h2>{workspace.kind === 'private' ? 'Create and organize' : `Shared board · ${selectedTeam?.name ?? 'Team'}`}</h2>
                  </div>
                  <div className="pill">{completedCount}/{visibleTodos.length} done</div>
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
                    {todoLoading ? 'Saving…' : workspace.kind === 'private' ? 'Add todo' : 'Create shared todo'}
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
                  {visibleTodos.map((todo) => (
                    <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                      <label className="todo-main">
                        <input type="checkbox" checked={todo.completed} onChange={() => void toggleTodo(todo)} />
                        <div>
                          <strong>{todo.title}</strong>
                          {todo.description ? <p>{todo.description}</p> : null}
                          {todo.teamId ? <span className="todo-badge">Shared</span> : null}
                        </div>
                      </label>
                      <button type="button" className="delete" disabled={pendingDeleteTodoId === todo.id} onClick={() => void removeTodo(todo.id)}>
                        {pendingDeleteTodoId === todo.id ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                  {!todoLoading && visibleTodos.length === 0 ? <li className="empty-state">No todos match this view yet.</li> : null}
                </ul>
              </section>

              {selectedTeam ? (
                <section className="panel" aria-label="team settings">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Team management</p>
                      <h2>{selectedTeam.name}</h2>
                    </div>
                    <div className="pill">Role: {currentRole ? getRoleLabel(currentRole) : 'Member'}</div>
                  </div>
                  <div className="team-grid">
                    <div className="team-card">
                      <h3>Settings</h3>
                      <form className="team-form" onSubmit={handleRenameTeam}>
                        <div className="field-group">
                          <label htmlFor="teamRename">Rename team</label>
                          <input
                            id="teamRename"
                            value={teamNameEdit}
                            onChange={(event) => setTeamNameEdit(event.target.value)}
                            disabled={!canPerformAction(currentRole, 'rename')}
                          />
                        </div>
                        <button type="submit" disabled={!canPerformAction(currentRole, 'rename')}>
                          Rename team
                        </button>
                      </form>
                      <button
                        type="button"
                        className="delete"
                        disabled={pendingDeleteTeam || !canPerformAction(currentRole, 'delete')}
                        onClick={handleDeleteTeam}
                      >
                        {pendingDeleteTeam ? 'Deleting…' : 'Delete team'}
                      </button>
                    </div>

                    <div className="team-card">
                      <h3>Members</h3>
                      <ul className="member-list">
                        {(selectedTeam.members ?? []).map((member) => (
                          <li key={member.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Avatar src={member.user?.avatarUrl} name={member.user?.name ?? member.userId} size={36} />
                              <div>
                                <strong>{member.user?.name ?? member.userId}</strong>
                                <p>{getRoleLabel(member.role)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              disabled={
                                pendingRemoveMemberId === member.id ||
                                !canPerformAction(currentRole, member.role === 'ADMIN' ? 'remove-admin' : 'remove-member') ||
                                member.userId === user.id
                              }
                              onClick={() => void handleRemoveMember(member)}
                            >
                              {pendingRemoveMemberId === member.id ? 'Removing…' : 'Remove'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="team-card">
                      <h3>Invites</h3>
                      <form className="team-form" onSubmit={handleInviteMember}>
                        <div className="field-group">
                          <label htmlFor="inviteEmail">Invite member</label>
                          <input
                            id="inviteEmail"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder="colleague@example.com"
                            disabled={!canPerformAction(currentRole, 'invite')}
                          />
                        </div>
                        <button type="submit" disabled={!canPerformAction(currentRole, 'invite')}>
                          Send invite
                        </button>
                      </form>
                      <ul className="member-list">
                        {(selectedTeam.invites ?? []).map((invite) => (
                          <li key={invite.id}>
                            <div>
                              <strong>{invite.email}</strong>
                              <p>{invite.status}</p>
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              disabled={pendingRevokeInviteId === invite.id || !canPerformAction(currentRole, 'revoke')}
                              onClick={() => void handleRevokeInvite(invite.id)}
                            >
                              {pendingRevokeInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {activeView === 'account' ? (
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
                    <label htmlFor="avatarUrl">Profile image URL</label>
                    <input
                      id="avatarUrl"
                      value={profileForm.avatarUrl}
                      onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })}
                      placeholder="https://example.com/avatar.png"
                    />
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
          ) : null}
        </main>
      ) : null}
    </div>
  )
}

export default App
