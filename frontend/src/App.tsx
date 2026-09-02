/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { getProfile, fetchAccountSettings, fetchChatUnreadCounts, fetchTeamDetails } from './api'
import type { AccountSettings, InviteRoute, ProfileData, TeamRole } from './types'
import { Layout } from './components/layouts/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Account } from './pages/Account'
import { AcceptInvite } from './pages/AcceptInvite'
import { TeamCalendar } from './components/workspace/TeamCalendar'
import { TeamChat } from './components/chat/TeamChat'
import { TeamMembers } from './components/workspace/TeamMembers'
import { TeamInvites } from './components/workspace/TeamInvites'
import { SharedFiles } from './components/files/SharedFiles'
import { TeamAnalytics } from './components/workspace/TeamAnalytics'
import { TeamSettings } from './components/workspace/TeamSettings'
import { useAuth } from './hooks/useAuth'
import { useTeams } from './hooks/useTeams'
import { useTodos } from './hooks/useTodos'
import { useWebSocket } from './hooks/useWebSocket'

type AppActiveView = 'tasks' | 'account' | 'calendar' | 'chat' | 'members' | 'files' | 'reports' | 'settings'

function getRoleLabel(role: TeamRole) {
  return role === 'OWNER' ? 'Owner' : role === 'ADMIN' ? 'Admin' : 'Member'
}

function canPerformAction(
  role: TeamRole | undefined,
  action: 'rename' | 'delete' | 'invite' | 'revoke' | 'remove-member' | 'remove-admin' | 'remove-owner' | 'view' | 'create'
) {
  if (!role) return false
  const roleMap: Record<TeamRole, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 }
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
  const [activeView, setActiveView] = useState<AppActiveView>('tasks')
  const [route, setRoute] = useState<InviteRoute>({ kind: 'tasks' })
  const [workspace, setWorkspace] = useState<{ kind: 'private' } | { kind: 'team'; teamId: string }>({
    kind: 'private',
  })

  const token = localStorage.getItem('authToken')
  const { status: wsStatus, sendTypingStatus, sendTaskDrawerState } = useWebSocket(
    token,
    workspace.kind === 'team' ? workspace.teamId : null,
    workspace.kind
  )

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
    selectedTeam,
    currentRole,
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
    handleUpdateMemberRole,
  } = useTeams(workspace, setWorkspace, user, canPerformAction)


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
      const params = new URLSearchParams(queryStr)
      if (path === '/accept-invite') {
        const token = params.get('token') ?? ''
        setRoute({ kind: 'accept-invite', token: token || undefined })
        setAcceptToken(token)
        setActiveView('tasks')
      } else if (path === '/verify') {
        const token = params.get('token') ?? ''
        setRoute({ kind: 'verify', token: token || undefined })
        setActiveView('tasks')
      } else if (path === '/reset-password') {
        const token = params.get('token') ?? ''
        setRoute({ kind: 'reset-password', token: token || undefined })
        setActiveView('tasks')
      } else if (path === '/activity' || path === '/notifications') {
        setRoute({ kind: 'tasks' })
        setActiveView('tasks')
      } else if (path === '/calendar') {
        setRoute({ kind: 'tasks' })
        setActiveView('calendar')
      } else if (path === '/chat') {
        setRoute({ kind: 'tasks' })
        setActiveView('chat')
      } else if (path === '/members') {
        setRoute({ kind: 'tasks' })
        setActiveView('members')
      } else if (path === '/files') {
        setRoute({ kind: 'tasks' })
        setActiveView('files')
      } else if (path === '/reports') {
        setRoute({ kind: 'tasks' })
        setActiveView('reports')
      } else if (path === '/settings') {
        setRoute({ kind: 'tasks' })
        setActiveView('settings')
      } else {
        setRoute({ kind: path === '/account' ? 'account' : 'tasks' })
        setActiveView(path === '/account' ? 'account' : 'tasks')
      }
    }
    syncRoute()
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [setAcceptToken])

  const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({})

  const loadUnreadCounts = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    try {
      const counts = await fetchChatUnreadCounts()
      const mapping: Record<string, number> = {}
      counts.forEach((c) => {
        mapping[c.teamId] = c.count
      })
      setChatUnreadCounts(mapping)
    } catch {}
  }, [])

  // Reload chat counts on incoming websocket messages
  useEffect(() => {
    const handleWsEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const msg = customEvent.detail
      if (!msg) return
      if (msg.eventType === 'CHAT_MESSAGE_CREATED' || msg.eventType === 'CHAT_READ') {
        void loadUnreadCounts()
      }
    }
    window.addEventListener('ws:event', handleWsEvent)
    return () => window.removeEventListener('ws:event', handleWsEvent)
  }, [loadUnreadCounts])

  // Trigger loads on sign in
  useEffect(() => {
    if (user) {
      void loadTodos()
      void loadTeams()
      void loadAccountData()
      void loadUnreadCounts()
    }
  }, [user, loadTodos, loadTeams, loadAccountData, loadUnreadCounts])

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

  // Reload team settings when workspace active team changes or WebSocket update notifies changes
  const reloadActiveTeamDetails = useCallback(() => {
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
                    stats: fullTeam.stats ?? t.stats,
                  }
                : t
            )
          )
        })
        .catch(() => {})
    }
  }, [workspace, setTeams])

  useEffect(() => {
    reloadActiveTeamDetails()
  }, [workspace, reloadActiveTeamDetails])

  // Real-time team presence & statistics synchronization
  useEffect(() => {
    const handleWsEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const wsMessage = customEvent.detail
      if (!wsMessage || !wsMessage.eventType) return

      const { eventType, workspaceId } = wsMessage

      if (
        eventType === 'PRESENCE_UPDATED' ||
        eventType === 'MEMBER_JOINED' ||
        eventType === 'MEMBER_LEFT' ||
        eventType === 'WORKSPACE_UPDATED' ||
        eventType === 'TASK_CREATED' ||
        eventType === 'TASK_UPDATED' ||
        eventType === 'TASK_DELETED'
      ) {
        void loadTeams()
        if (workspace.kind === 'team' && (workspaceId === workspace.teamId || eventType === 'PRESENCE_UPDATED')) {
          reloadActiveTeamDetails()
        }
      }
    }

    window.addEventListener('ws:event', handleWsEvent)
    return () => window.removeEventListener('ws:event', handleWsEvent)
  }, [workspace, loadTeams, reloadActiveTeamDetails])

  const handleViewChange = (view: any) => {
    setActiveView(view)
    window.location.hash = view === 'account' ? '#/account' : view === 'activity' ? '#/activity' : '#/tasks'
  }

  return (
    <Layout
      user={user}
      activeView={route.kind === 'accept-invite' ? 'accept-invite' : activeView}
      onViewChange={handleViewChange}
      onLogout={handleLogout}
      wsStatus={wsStatus}
      workspace={workspace}
      setWorkspace={setWorkspace}
      teams={teams}
      chatUnreadCounts={chatUnreadCounts}
      query={query}
      setQuery={setQuery}
      teamForm={teamForm}
      setTeamForm={setTeamForm}
      onCreateTeam={handleCreateTeam}
      teamError={teamError}
      teamMessage={teamMessage}
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
          route={route}
          setRoute={setRoute}
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
      ) : activeView === 'calendar' ? (
        <div className="page-view-wrapper">
          <TeamCalendar
            selectedTeam={selectedTeam}
            todosProps={visibleTodos}
            onSelectTodo={(id) => {
              window.location.hash = `#/tasks`
              // slight delay to let tasks page mount, then open drawer
              setTimeout(() => window.dispatchEvent(new CustomEvent('open:task', { detail: id })), 100)
            }}
            onAddTaskOnDate={(date) => {
              if (date) {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                setTodoForm((prev: any) => ({ ...prev, dueDate: `${year}-${month}-${day}` }))
              }
              window.location.hash = '#/tasks'
              setTimeout(() => window.dispatchEvent(new CustomEvent('open:add-task')), 100)
            }}
          />
        </div>
      ) : activeView === 'chat' && selectedTeam && user ? (
        <div className="page-view-wrapper">
          <TeamChat
            teamId={selectedTeam.id}
            currentUser={user}
            teamMembers={selectedTeam.members || []}
          />
        </div>
      ) : activeView === 'members' && selectedTeam ? (
        <div className="page-view-wrapper">
          <TeamMembers
            selectedTeam={selectedTeam}
            currentRole={currentRole}
            user={user!}
            onRemoveMember={(member) => { if (selectedTeam) void handleRemoveMember(selectedTeam, member) }}
            isRemovingMemberId={pendingRemoveMemberId}
            onUpdateMemberRole={(userId, role) => { if (selectedTeam) void handleUpdateMemberRole(selectedTeam, userId, role) }}
            canPerformAction={canPerformAction}
            getRoleLabel={getRoleLabel}
            todos={visibleTodos}
          />
          <TeamInvites
            selectedTeam={selectedTeam}
            currentRole={currentRole}
            inviteEmail={inviteEmail}
            onChangeInviteEmail={setInviteEmail}
            onInviteMember={(e) => { e.preventDefault(); if (selectedTeam) void handleInviteMember(selectedTeam) }}
            onRevokeInvite={(inviteId) => { if (selectedTeam) void handleRevokeInvite(selectedTeam, inviteId) }}
            isRevokingInviteId={pendingRevokeInviteId}
            onInviteAgain={(email) => { if (selectedTeam) void handleInviteAgain(selectedTeam, email) }}
            canPerformAction={canPerformAction}
          />
        </div>
      ) : activeView === 'files' ? (
        <div className="page-view-wrapper">
          <SharedFiles
            attachments={(visibleTodos.flatMap((t) => (t.attachments || []).map((a) => ({ ...a, taskTitle: t.title, taskId: t.id }))))}
            onReload={loadTodos}
          />
        </div>
      ) : activeView === 'reports' && selectedTeam ? (
        <div className="page-view-wrapper">
          <TeamAnalytics selectedTeam={selectedTeam} todos={visibleTodos} />
        </div>
      ) : activeView === 'settings' ? (
        <div className="page-view-wrapper">
          {selectedTeam ? (
            <TeamSettings
              selectedTeam={selectedTeam}
              currentRole={currentRole}
              teamNameEdit={teamNameEdit}
              onChangeTeamNameEdit={setTeamNameEdit}
              onRenameTeam={(e) => { e.preventDefault(); if (selectedTeam) void handleRenameTeam(selectedTeam) }}
              onDeleteTeam={() => { if (selectedTeam) void handleDeleteTeam(selectedTeam) }}
              isDeletingTeam={pendingDeleteTeam}
              canPerformAction={canPerformAction}
            />
          ) : (
            <Account
              user={user!}
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
          )}
        </div>
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
          onUpdateMemberRole={(userId, role) => {
            if (selectedTeam) void handleUpdateMemberRole(selectedTeam, userId, role)
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
          wsStatus={wsStatus}
          sendTypingStatus={sendTypingStatus}
          sendTaskDrawerState={sendTaskDrawerState}
          chatUnreadCounts={chatUnreadCounts}
        />
      )}
    </Layout>
  )
}

export default App
