import { type FormEvent, useState, useEffect, useMemo } from 'react'
import type { Team, TeamMember, TeamRole, Todo, User, WorkspaceSelection } from '../types'
import { TodoForm } from '../components/task/TodoForm'
import { TaskDetailsDrawer } from '../components/task/TaskDetailsDrawer'
import { TeamChat } from '../components/chat/TeamChat'
import { SharedFiles } from '../components/files/SharedFiles'
import { ActivityTimeline } from './ActivityTimeline'

// New modular components
import { WorkspaceOverview } from '../components/workspace/WorkspaceOverview'
import { TeamSettings } from '../components/workspace/TeamSettings'
import { TeamMembers } from '../components/workspace/TeamMembers'
import { TeamInvites } from '../components/workspace/TeamInvites'
import { TeamAnalytics } from '../components/workspace/TeamAnalytics'
import { TeamCalendar } from '../components/workspace/TeamCalendar'
import { TaskList } from '../components/task/TaskList'
import { TaskBoard } from '../components/task/TaskBoard'
import { Modal } from '../components/shared/Modal'
import { Tabs } from '../components/shared/Tabs'
import { Card } from '../components/shared/Card'

interface DashboardProps {
  user: User
  workspace: WorkspaceSelection
  setWorkspace: (val: WorkspaceSelection) => void
  teams: Team[]
  teamForm: { name: string; description: string; purpose: string }
  setTeamForm: (val: any) => void
  onCreateTeam: () => void
  teamError: string
  teamMessage: string
  todoForm: { title: string; description: string; assignedUserId?: string }
  setTodoForm: (val: any) => void
  todoLoading: boolean
  onSubmitTodo: (event: FormEvent<HTMLFormElement>) => void
  filter: 'all' | 'active' | 'completed'
  setFilter: (val: 'all' | 'active' | 'completed') => void
  query: string
  setQuery: (val: string) => void
  statusMessage: string
  visibleTodos: Todo[]
  completedCount: number
  selectedTeam: Team | null
  currentRole: TeamRole | undefined
  teamNameEdit: string
  setTeamNameEdit: (val: string) => void
  onRenameTeam: (event: FormEvent<HTMLFormElement>) => void
  onDeleteTeam: () => void
  pendingDeleteTeam: boolean
  inviteEmail: string
  setInviteEmail: (val: string) => void
  onInviteMember: (event: FormEvent<HTMLFormElement>) => void
  onRevokeInvite: (id: string) => void
  pendingRevokeInviteId: string | null
  onRemoveMember: (member: TeamMember) => void
  pendingRemoveMemberId: string | null
  pendingDeleteTodoId: string | null
  onToggleTodo: (todo: Todo) => void
  onRemoveTodo: (id: string) => void
  onAssignTodo?: (todoId: string, assignedUserId: string | null) => void
  onInviteAgain?: (email: string) => void
  canPerformAction: (role: TeamRole | undefined, action: any) => boolean
  getRoleLabel: (role: TeamRole) => string

  priorityFilter: string
  setPriorityFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  assigneeFilter: string
  setAssigneeFilter: (val: string) => void
  dueFilter: string
  setDueFilter: (val: string) => void
  onReloadTodos: () => void

  wsStatus?: 'connected' | 'disconnected' | 'reconnecting'
  sendTypingStatus?: (taskId: string, isTyping: boolean) => void
  sendTaskDrawerState?: (taskId: string, open: boolean) => void
  chatUnreadCounts?: Record<string, number>
  onUpdateMemberRole?: (userId: string, role: TeamRole) => void
}

type SubTab = 'overview' | 'tasks' | 'chat' | 'members' | 'invites' | 'files' | 'timeline' | 'analytics' | 'settings' | 'calendar'

export function Dashboard({
  user,
  workspace,
  teams: _teams,
  teamForm: _teamForm,
  setTeamForm: _setTeamForm,
  onCreateTeam: _onCreateTeam,
  teamError: _teamError,
  teamMessage: _teamMessage,
  todoForm,
  setTodoForm,
  todoLoading,
  onSubmitTodo,
  filter,
  setFilter,
  query,
  setQuery,
  statusMessage,
  visibleTodos,
  completedCount: _completedCount,
  selectedTeam,
  currentRole,
  teamNameEdit,
  setTeamNameEdit,
  onRenameTeam,
  onDeleteTeam,
  pendingDeleteTeam,
  inviteEmail,
  setInviteEmail,
  onInviteMember,
  onRevokeInvite,
  pendingRevokeInviteId,
  onRemoveMember,
  pendingRemoveMemberId,
  pendingDeleteTodoId,
  onToggleTodo,
  onRemoveTodo,
  onAssignTodo,
  onInviteAgain,
  canPerformAction,
  getRoleLabel,

  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  assigneeFilter,
  setAssigneeFilter,
  dueFilter,
  setDueFilter,
  onReloadTodos,
  wsStatus: _wsStatus,
  sendTypingStatus,
  sendTaskDrawerState,
  chatUnreadCounts = {},
  onUpdateMemberRole,
}: DashboardProps) {
  const [layoutMode, setLayoutMode] = useState<'list' | 'board'>('list')
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview')
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)

  useEffect(() => {
    const handleOpenAddTask = () => setIsAddTaskOpen(true)
    window.addEventListener('open:add-task', handleOpenAddTask)
    return () => window.removeEventListener('open:add-task', handleOpenAddTask)
  }, [])

  // Reset tab selection when workspace switches context
  useEffect(() => {
    setActiveSubTab('overview')
  }, [workspace.kind, (workspace as any).teamId])

  // Sync teamNameEdit state with selectedTeam name when selectedTeam changes
  useEffect(() => {
    if (selectedTeam) {
      setTeamNameEdit(selectedTeam.name)
    }
  }, [selectedTeam, setTeamNameEdit])

  // Gather attachments across all visible tasks for SharedFiles view
  const allAttachments = useMemo(() => {
    const list: any[] = []
    visibleTodos.forEach((todo) => {
      if (todo.attachments) {
        todo.attachments.forEach((a) => {
          list.push({ ...a, taskTitle: todo.title, taskId: todo.id })
        })
      }
    })
    return list
  }, [visibleTodos])

  const handleTaskUpdatedInDrawer = () => {
    onReloadTodos()
  }

  const handleCreateTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmitTodo(event)
    setIsAddTaskOpen(false)
  }

  // Generate tab options for team workspace
  const tabOptions = useMemo(() => {
    if (workspace.kind !== 'team') return []
    const chatCount = chatUnreadCounts[workspace.teamId] || 0
    
    const options = [
      { id: 'overview', label: 'Overview' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'chat', label: 'Discussion', badge: chatCount > 0 ? chatCount : undefined },
      { id: 'members', label: 'Members' },
    ]

    // Only show invites tab to owners/admins
    if (canPerformAction(currentRole, 'invite')) {
      options.push({ id: 'invites', label: 'Invites' })
    }

    options.push(
      { id: 'files', label: 'Files' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'analytics', label: 'Analytics' }
    )

    // Only show settings tab if the user has rename/delete permissions
    if (canPerformAction(currentRole, 'rename') || canPerformAction(currentRole, 'delete')) {
      options.push({ id: 'settings', label: 'Settings' })
    }

    return options
  }, [workspace, chatUnreadCounts, currentRole, canPerformAction])

  const friendlyGreeting = useMemo(() => {
    const hours = new Date().getHours()
    let greeting = 'Good morning'
    if (hours >= 12 && hours < 17) greeting = 'Good afternoon'
    else if (hours >= 17) greeting = 'Good evening'
    return greeting
  }, [])

  return (
    <div className="dashboard-content w-full flex flex-col gap-6">
      {/* 1. GREETING BANNER & NAVIGATION HEADER */}
      <section className="dashboard-banner flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-divider p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {friendlyGreeting}, {user.name}
          </h1>
          <p className="text-sm text-secondary mt-1">
            {workspace.kind === 'private'
              ? "Here's a look at your private dashboard work logs for today."
              : `Welcome to the ${selectedTeam?.name || 'Workspace'} team discussion room and task boards.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-secondary bg-surface border border-divider px-3 py-1.5 rounded-full">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button type="button" className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl" onClick={() => window.dispatchEvent(new CustomEvent('open:create-team'))}>
            + Workspace
          </button>
          <button type="button" className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl" onClick={() => setIsAddTaskOpen(true)}>
            <span className="text-sm">+</span> New Task
          </button>
        </div>
      </section>

      {/* 2. TABS BAR FOR TEAM WORKSPACES */}
      {workspace.kind === 'team' && (
        <Tabs options={tabOptions} activeId={activeSubTab} onChange={setActiveSubTab} />
      )}

      {/* SECTION TITLE & ACTION HEADER */}
      {workspace.kind === 'team' && activeSubTab !== 'overview' && (
        <div className="section-page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-2 border-b border-divider/40">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {activeSubTab === 'chat' && 'Discussions'}
              {activeSubTab === 'tasks' && 'Tasks'}
              {activeSubTab === 'members' && 'Members'}
              {activeSubTab === 'invites' && 'Invites'}
              {activeSubTab === 'files' && 'Files'}
              {activeSubTab === 'timeline' && 'Timeline'}
              {activeSubTab === 'calendar' && 'Calendar'}
              {activeSubTab === 'analytics' && 'Analytics'}
              {activeSubTab === 'settings' && 'Settings'}
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {activeSubTab === 'chat' && 'Collaborate and communicate with your team'}
              {activeSubTab === 'tasks' && 'Manage, filter, and track project tasks'}
              {activeSubTab === 'members' && 'Manage workspace members and permissions'}
              {activeSubTab === 'invites' && 'Manage workspace invitations'}
              {activeSubTab === 'files' && 'Shared documents and task attachments'}
              {activeSubTab === 'timeline' && 'Activity log and workspace updates'}
              {activeSubTab === 'calendar' && 'Schedule and view upcoming deadlines'}
              {activeSubTab === 'analytics' && 'Workspace insights and performance overview'}
              {activeSubTab === 'settings' && 'Manage workspace settings and preferences'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeSubTab === 'members' && (
              <button type="button" className="btn-primary text-xs py-2 px-4 rounded-xl" onClick={() => setActiveSubTab('invites')}>
                + Add Members
              </button>
            )}
            {activeSubTab === 'invites' && (
              <button type="button" className="btn-primary text-xs py-2 px-4 rounded-xl" onClick={() => {
                const el = document.getElementById('invite-email-input')
                if (el) el.focus()
              }}>
                + Invite People
              </button>
            )}
            {activeSubTab === 'tasks' && (
              <button type="button" className="btn-primary text-xs py-2 px-4 rounded-xl" onClick={() => setIsAddTaskOpen(true)}>
                + New Task
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. CORE SUB-VIEW ROUTER PANEL */}
      <div className="dashboard-views-viewport">
        {/* TAB: Overview (and private workspace default dashboard) */}
        {(activeSubTab === 'overview' || workspace.kind === 'private') && (
          <WorkspaceOverview
            user={user}
            workspace={workspace}
            todos={visibleTodos}
            onToggleTodo={onToggleTodo}
            onSelectTodo={(id) => setSelectedTodoId(id)}
            onAddTaskClick={() => setIsAddTaskOpen(true)}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab as any}
            teamMembers={selectedTeam?.members || []}
          />
        )}

        {/* TAB: Tasks Board/List View */}
        {activeSubTab === 'tasks' && workspace.kind === 'team' && (
          <div className="tasks-manager-container flex flex-col gap-6 animated-fade-in">
            {/* Filter tools card */}
            <Card className="filters-card-panel">
              <div className="flex justify-between items-center flex-wrap gap-4 pb-3 border-b border-divider/50 mb-3">
                <h3 className="text-sm font-bold text-foreground">Filter & Search Tasks</h3>
                <div className="layout-mode-switcher flex bg-surface border border-divider p-0.5 rounded-xl">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${layoutMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-secondary hover:text-foreground'}`}
                    onClick={() => setLayoutMode('list')}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${layoutMode === 'board' ? 'bg-card text-foreground shadow-sm' : 'text-secondary hover:text-foreground'}`}
                    onClick={() => setLayoutMode('board')}
                  >
                    Board
                  </button>
                </div>
              </div>

              <div className="filters-controls-row flex flex-wrap gap-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type to filter titles..."
                  className="form-field text-xs px-3 py-2 border border-divider rounded-xl flex-grow"
                />

                {layoutMode === 'list' && (
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="form-field text-xs px-2 py-2 border border-divider rounded-xl bg-card"
                  >
                    <option value="all">All States</option>
                    <option value="active">Active State</option>
                    <option value="completed">Completed State</option>
                  </select>
                )}

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="form-field text-xs px-2 py-2 border border-divider rounded-xl bg-card"
                >
                  <option value="all">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

                {layoutMode === 'list' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-field text-xs px-2 py-2 border border-divider rounded-xl bg-card"
                  >
                    <option value="all">All Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                )}

                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="form-field text-xs px-2 py-2 border border-divider rounded-xl bg-card"
                >
                  <option value="all">All Assignees</option>
                  {selectedTeam?.members?.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name || m.userId}
                    </option>
                  ))}
                </select>

                <select
                  value={dueFilter}
                  onChange={(e) => setDueFilter(e.target.value)}
                  className="form-field text-xs px-2 py-2 border border-divider rounded-xl bg-card"
                >
                  <option value="all">Any Date</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="tomorrow">Due Tomorrow</option>
                  <option value="future">Future Tasks</option>
                </select>
              </div>

              {statusMessage && <p className="status-text mt-3 text-xs">{statusMessage}</p>}
            </Card>

            {/* Core list/kanban switch render */}
            {layoutMode === 'list' ? (
              <TaskList
                todos={visibleTodos}
                onToggle={onToggleTodo}
                onRemove={onRemoveTodo}
                isDeletingId={pendingDeleteTodoId}
                teamMembers={selectedTeam?.members || []}
                onAssign={onAssignTodo}
                onClickDetails={(id) => setSelectedTodoId(id)}
              />
            ) : (
              <TaskBoard
                todos={visibleTodos}
                onToggle={onToggleTodo}
                onClickDetails={(id) => setSelectedTodoId(id)}
                teamMembers={selectedTeam?.members || []}
              />
            )}
          </div>
        )}

        {/* TAB: Discussion Chat */}
        {activeSubTab === 'chat' && workspace.kind === 'team' && (
          <TeamChat teamId={workspace.teamId} currentUser={user} teamMembers={selectedTeam?.members || []} />
        )}

        {/* TAB: Members List */}
        {activeSubTab === 'members' && selectedTeam && (
          <TeamMembers
            selectedTeam={selectedTeam}
            currentRole={currentRole}
            user={user}
            onRemoveMember={onRemoveMember}
            isRemovingMemberId={pendingRemoveMemberId}
            onUpdateMemberRole={onUpdateMemberRole}
            canPerformAction={canPerformAction}
            getRoleLabel={getRoleLabel}
            todos={visibleTodos}
          />
        )}

        {/* TAB: Send Invites */}
        {activeSubTab === 'invites' && selectedTeam && (
          <TeamInvites
            selectedTeam={selectedTeam}
            currentRole={currentRole}
            inviteEmail={inviteEmail}
            onChangeInviteEmail={setInviteEmail}
            onInviteMember={onInviteMember}
            onRevokeInvite={onRevokeInvite}
            isRevokingInviteId={pendingRevokeInviteId}
            onInviteAgain={onInviteAgain}
            canPerformAction={canPerformAction}
          />
        )}

        {/* TAB: Shared Files */}
        {activeSubTab === 'files' && (
          <SharedFiles attachments={allAttachments} onReload={onReloadTodos} />
        )}

        {/* TAB: Activity Timeline */}
        {activeSubTab === 'timeline' && workspace.kind === 'team' && (
          <ActivityTimeline workspaceId={workspace.teamId} />
        )}

        {/* TAB: Analytics Chart */}
        {activeSubTab === 'analytics' && selectedTeam && (
          <TeamAnalytics selectedTeam={selectedTeam} todos={visibleTodos} />
        )}

        {/* TAB: Calendar Schedule */}
        {activeSubTab === 'calendar' && selectedTeam && (
          <TeamCalendar
            selectedTeam={selectedTeam}
            onSelectTodo={(id) => setSelectedTodoId(id)}
            onAddTaskOnDate={(_date) => {
              // Open new task modal
              setIsAddTaskOpen(true)
            }}
          />
        )}

        {/* TAB: Workspace Team Settings */}
        {activeSubTab === 'settings' && selectedTeam && (
          <TeamSettings
            selectedTeam={selectedTeam}
            currentRole={currentRole}
            teamNameEdit={teamNameEdit}
            onChangeTeamNameEdit={setTeamNameEdit}
            onRenameTeam={onRenameTeam}
            onDeleteTeam={onDeleteTeam}
            isDeletingTeam={pendingDeleteTeam}
            canPerformAction={canPerformAction}
          />
        )}
      </div>

      {/* 4. MODAL: ADD TASK DIALOG */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Create New Task" size="md">
        <TodoForm
          title={todoForm.title}
          description={todoForm.description}
          assignedUserId={todoForm.assignedUserId}
          dueDate={(todoForm as any).dueDate}
          priority={(todoForm as any).priority}
          onChangeTitle={(val) => setTodoForm({ ...todoForm, title: val })}
          onChangeDescription={(val) => setTodoForm({ ...todoForm, description: val })}
          onChangeAssignedUserId={(val) => setTodoForm({ ...todoForm, assignedUserId: val })}
          onChangeDueDate={(val) => setTodoForm({ ...todoForm, dueDate: val })}
          onChangePriority={(val) => setTodoForm({ ...todoForm, priority: val })}
          onSubmit={handleCreateTaskSubmit}
          isLoading={todoLoading}
          isShared={workspace.kind === 'team'}
          members={selectedTeam?.members || []}
        />
      </Modal>

      {/* 5. DRAWER: TASK DETAILS OVERLAY PANEL */}
      {selectedTodoId && (
        <TaskDetailsDrawer
          todoId={selectedTodoId}
          currentUser={user}
          teamMembers={selectedTeam?.members || []}
          teamRole={currentRole}
          onClose={() => setSelectedTodoId(null)}
          onTaskUpdated={handleTaskUpdatedInDrawer}
          sendTypingStatus={sendTypingStatus}
          sendTaskDrawerState={sendTaskDrawerState}
        />
      )}
    </div>
  )
}

export default Dashboard
