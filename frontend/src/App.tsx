/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { getProfile, fetchAccountSettings } from './api'
import type { AccountSettings, InviteRoute, ProfileData, TeamRole } from './types'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Account } from './pages/Account'
import { AcceptInvite } from './pages/AcceptInvite'
import { ActivityTimeline } from './pages/ActivityTimeline'
import { useAuth } from './hooks/useAuth'
import { useTodos } from './hooks/useTodos'
import { useTeams } from './hooks/useTeams'

function getRoleLabel(role: TeamRole) {
  return role === 'OWNER' ? 'Owner' : role === 'ADMIN' ? 'Admin' : 'Member'
}

function canPerformAction(
  role: TeamRole | undefined,
  action: 'rename' | 'delete' | 'invite' | 'revoke' | 'remove-member' | 'remove-admin' | 'remove-owner' | 'view' | 'create'
) {
  if (!role) return action === 'view' || action === 'create'
  const roleMap: Record<TeamRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
  const required: Record<string, number> = {
    rename: 3,
    delete: 3,
    invite: 2,
    revoke: 2,
    'remove-member': 2,
    'remove-admin': 3,
    'remove-owner': 99,
    view: 1,
    create: 1,
  }
  return roleMap[role] >= (required[action] ?? 1)
}

function applyTheme(theme: AccountSettings['theme']) {
  let resolvedTheme = theme || 'system'
  if (resolvedTheme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme)
}

function App() {
  const [activeView, setActiveView] = useState<'tasks' | 'account' | 'activity'>('tasks')
  const [route, setRoute] = useState<InviteRoute>({ kind: 'tasks' })
  const [workspace, setWorkspace] = useState<{ kind: 'private' } | { kind: 'team'; teamId: string }>({
    kind: 'private',
  })

  // Hook 1: Auth State & Session Actions
  const {
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    authError,
    setAuthError,
    user,
    setUser,
    loading: authLoading,
    handleLogin,
    handleRegister,
    handleLogout,
  } = useAuth(() => {
    setWorkspace({ kind: 'private' })
    setActiveView('tasks')
    window.location.hash = '#/tasks'
  })

  // Hook 2: Todos
  const {
    setTodos,
    todoForm,
    setTodoForm,
    todoLoading,
    query,
    setQuery,
    filter,
    setFilter,
    statusMessage,
    setStatusMessage,
    pendingDeleteTodoId,
    loadTodos,
    submitTodo,
    handleToggleTodo,
    handleUpdateAssignee,
    handleRemoveTodo,
    visibleTodos,
    completedCount,
    priorityFilter,
    setPriorityFilter,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    dueFilter,
    setDueFilter,
  } = useTodos(workspace)

  // Hook 3: Teams
  const {
    teams,
    setTeams,
    teamForm,
    setTeamForm,
    teamNameEdit,
    setTeamNameEdit,
    inviteEmail,
    setInviteEmail,
    teamError,
    setTeamError,
    teamMessage,
    setTeamMessage,
    acceptToken,
    setAcceptToken,
    pendingRevokeInviteId,
    pendingDeleteTeam,
    pendingRemoveMemberId,
    loadTeams,
    handleCreateTeam,
    handleRenameTeam,
    handleDeleteTeam,
    handleInviteMember,
    handleInviteAgain,
    handleRevokeInvite,
    handleRemoveMember,
    handleAcceptInvite,
  } = useTeams(workspace, setWorkspace, user, canPerformAction)

  // Memoized Team context helpers
  const selectedTeam = useMemo(() => {
    if (workspace.kind === 'team') {
      return teams.find((team) => team.id === workspace.teamId) ?? null
    }
    return null
  }, [workspace, teams])

  const currentRole = useMemo(() => {
    if (!user || !selectedTeam) return undefined
    return (
      (selectedTeam.members ?? []).find((member) => member.userId === user.id)?.role ??
      selectedTeam.myRole
    )
  }, [selectedTeam, user])

  // Account settings panel local state
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', phoneNumber: '', avatarUrl: '' })
  const [settingsForm, setSettingsForm] = useState({
    theme: 'system' as AccountSettings['theme'],
    notifications: true,
    emailAlerts: true,
    language: 'en',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [accountError, setAccountError] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [accountSyncLoading, setAccountSyncLoading] = useState(false)
  const [saveProfileLoading, setSaveProfileLoading] = useState(false)
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false)
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)

  const loadAccountData = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    setAccountSyncLoading(true)
    setAccountError('')
    setAccountMessage('')
    try {
      const [profileResult, settingsResult] = await Promise.all([
        getProfile(),
        fetchAccountSettings(),
      ])
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
      setAccountError(
        error instanceof Error ? error.message : 'Unable to load account details.'
      )
    } finally {
      setAccountSyncLoading(false)
    }
  }, [user?.name])

  // Sync state with URL hash routing
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
      } else if (path === '/activity') {
        setRoute({ kind: 'tasks' })
        setActiveView('activity')
      } else {
        setRoute({ kind: path === '/account' ? 'account' : 'tasks' })
        setActiveView(path === '/account' ? 'account' : 'tasks')
      }
    }
    syncRoute()
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [setAcceptToken])

  // Trigger loads on sign in
  useEffect(() => {
    if (user) {
      void loadTodos()
      void loadTeams()
      void loadAccountData()
    }
  }, [user, loadTodos, loadTeams, loadAccountData])

  // Listen to workspace changes from notifications click-through
  useEffect(() => {
    const handleWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ kind: 'team'; teamId: string }>
      if (customEvent.detail) {
        setWorkspace(customEvent.detail)
        setActiveView('tasks')
        window.location.hash = '#/tasks'
      }
    }
    window.addEventListener('workspace:change', handleWorkspaceChange)
    return () => window.removeEventListener('workspace:change', handleWorkspaceChange)
  }, [setWorkspace])

  // Handle unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      setTodos([])
      setStatusMessage('Session expired. Please log in again.')
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [setUser, setTodos, setStatusMessage])

  // Reload team settings when workspace active team changes
  useEffect(() => {
    if (workspace.kind === 'team') {
      import('./api')
        .then(({ fetchTeamDetails }) => fetchTeamDetails(workspace.teamId))
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
                : t
            )
          )
        })
        .catch(() => {})
    }
  }, [workspace, setTeams])

  const handleViewChange = (view: 'tasks' | 'account' | 'activity') => {
    setActiveView(view)
    window.location.hash = view === 'account' ? '#/account' : view === 'activity' ? '#/activity' : '#/tasks'
  }

  return (
    <Layout
      user={user}
      activeView={route.kind === 'accept-invite' ? 'accept-invite' : activeView}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
    >
      {!user ? (
        <Login
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          authError={authError}
          setAuthError={setAuthError}
          loading={authLoading}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onSuccess={() => setActiveView('tasks')}
        />
      ) : route.kind === 'accept-invite' ? (
        <AcceptInvite
          acceptToken={acceptToken}
          setAcceptToken={setAcceptToken}
          onAcceptInvite={handleAcceptInvite}
          teamError={teamError}
          setTeamError={setTeamError}
          teamMessage={teamMessage}
          setTeamMessage={setTeamMessage}
          onSuccess={() => {
            setActiveView('tasks')
            window.location.hash = '#/tasks'
          }}
        />
      ) : activeView === 'account' ? (
        <Account
          user={user}
          setUser={setUser}
          onLogout={handleLogout}
          profile={profile}
          setProfile={setProfile}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          accountError={accountError}
          setAccountError={setAccountError}
          accountMessage={accountMessage}
          setAccountMessage={setAccountMessage}
          accountSyncLoading={accountSyncLoading}
          saveProfileLoading={saveProfileLoading}
          setSaveProfileLoading={setSaveProfileLoading}
          saveSettingsLoading={saveSettingsLoading}
          setSaveSettingsLoading={setSaveSettingsLoading}
          changePasswordLoading={changePasswordLoading}
          setChangePasswordLoading={setChangePasswordLoading}
          applyTheme={applyTheme}
        />
      ) : activeView === 'activity' ? (
        <ActivityTimeline />
      ) : (
        <Dashboard
          user={user}
          workspace={workspace}
          setWorkspace={setWorkspace}
          teams={teams}
          teamForm={teamForm}
          setTeamForm={setTeamForm}
          onCreateTeam={handleCreateTeam}
          teamError={teamError}
          teamMessage={teamMessage}
          todoForm={todoForm}
          setTodoForm={setTodoForm}
          todoLoading={todoLoading}
          onSubmitTodo={(event) => {
            event.preventDefault()
            void submitTodo()
          }}
          filter={filter}
          setFilter={setFilter}
          query={query}
          setQuery={setQuery}
          statusMessage={statusMessage}
          visibleTodos={visibleTodos}
          completedCount={completedCount}
          selectedTeam={selectedTeam}
          currentRole={currentRole}
          teamNameEdit={teamNameEdit}
          setTeamNameEdit={setTeamNameEdit}
          onRenameTeam={(event) => {
            event.preventDefault()
            if (selectedTeam) void handleRenameTeam(selectedTeam)
          }}
          onDeleteTeam={() => {
            if (selectedTeam) void handleDeleteTeam(selectedTeam)
          }}
          pendingDeleteTeam={pendingDeleteTeam}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          onInviteMember={(event) => {
            event.preventDefault()
            if (selectedTeam) void handleInviteMember(selectedTeam)
          }}
          onRevokeInvite={(inviteId) => {
            if (selectedTeam) void handleRevokeInvite(selectedTeam, inviteId)
          }}
          pendingRevokeInviteId={pendingRevokeInviteId}
          onRemoveMember={(member) => {
            if (selectedTeam) void handleRemoveMember(selectedTeam, member)
          }}
          pendingRemoveMemberId={pendingRemoveMemberId}
          pendingDeleteTodoId={pendingDeleteTodoId}
          onToggleTodo={handleToggleTodo}
          onRemoveTodo={handleRemoveTodo}
          onAssignTodo={handleUpdateAssignee}
          onInviteAgain={(email) => {
            if (selectedTeam) void handleInviteAgain(selectedTeam, email)
          }}
          canPerformAction={canPerformAction}
          getRoleLabel={getRoleLabel}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          dueFilter={dueFilter}
          setDueFilter={setDueFilter}
          onReloadTodos={loadTodos}
        />
      )}
    </Layout>
  )
}

export default App
