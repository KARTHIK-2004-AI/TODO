import { type FormEvent, useState } from 'react'
import type { Team, TeamMember, TeamRole, Todo, User, WorkspaceSelection } from '../types'
import { TodoForm } from '../components/TodoForm'
import { TodoItem } from '../components/TodoItem'
import { TeamCard } from '../components/TeamCard'
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer'

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
  canPerformAction: (
    role: TeamRole | undefined,
    action:
      | 'rename'
      | 'delete'
      | 'invite'
      | 'revoke'
      | 'remove-member'
      | 'remove-admin'
      | 'remove-owner'
      | 'view'
      | 'create'
  ) => boolean
  getRoleLabel: (role: TeamRole) => string

  // Sprint 5 filter props
  priorityFilter: string
  setPriorityFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  assigneeFilter: string
  setAssigneeFilter: (val: string) => void
  dueFilter: string
  setDueFilter: (val: string) => void
  onReloadTodos: () => void
}

export function Dashboard({
  user,
  workspace,
  setWorkspace,
  teams,
  teamForm,
  setTeamForm,
  onCreateTeam,
  teamError,
  teamMessage,
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
  completedCount,
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

  // Sprint 5 props
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  assigneeFilter,
  setAssigneeFilter,
  dueFilter,
  setDueFilter,
  onReloadTodos,
}: DashboardProps) {
  const [layoutMode, setLayoutMode] = useState<'list' | 'board'>('list')
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)

  const handleCreateTeamSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCreateTeam()
  }

  // Group todos by columns for Kanban Board
  const boardColumns = {
    TODO: visibleTodos.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: visibleTodos.filter((t) => t.status === 'IN_PROGRESS'),
    IN_REVIEW: visibleTodos.filter((t) => t.status === 'IN_REVIEW'),
    DONE: visibleTodos.filter((t) => t.status === 'DONE'),
  }

  const handleTaskUpdatedInDrawer = () => {
    onReloadTodos()
  }

  return (
    <main className="content-grid">
      {/* LEFT COLUMN: CONTEXT SELECTOR & CREATOR */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workspace switcher</p>
            <h2>Select your context</h2>
          </div>
          <div className="pill">{workspace.kind === 'private' ? 'Private' : 'Shared'}</div>
        </div>
        <div className="workspace-switcher">
          <button
            type="button"
            className={workspace.kind === 'private' ? 'active' : 'secondary'}
            onClick={() => setWorkspace({ kind: 'private' })}
          >
            Private
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={
                workspace.kind === 'team' && workspace.teamId === team.id
                  ? 'active'
                  : 'secondary'
              }
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
        <form className="team-create-form" onSubmit={handleCreateTeamSubmit}>
          <div className="field-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="teamName">Create team</label>
            <input
              id="teamName"
              value={teamForm.name}
              onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
              placeholder="Operations"
            />
          </div>
          <div className="field-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="teamDescription">Description (Optional)</label>
            <input
              id="teamDescription"
              value={teamForm.description}
              onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })}
              placeholder="E.g., Brand expansion"
            />
          </div>
          <div className="field-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="teamPurpose">Purpose (Optional)</label>
            <input
              id="teamPurpose"
              value={teamForm.purpose}
              onChange={(event) => setTeamForm({ ...teamForm, purpose: event.target.value })}
              placeholder="E.g., Launch the product in Q3"
            />
          </div>
          <button type="submit">Create team</button>
        </form>
        {teamError ? <p className="error-text">{teamError}</p> : null}
        {teamMessage ? <p className="status-text">{teamMessage}</p> : null}
      </section>

      {/* RIGHT COLUMN: TASK CREATION FORM */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Todo workspace</p>
            <h2>
              {workspace.kind === 'private'
                ? 'Create and organize'
                : `Shared board · ${selectedTeam?.name ?? 'Team'}`}
            </h2>
          </div>
          <div className="pill">
            {completedCount}/{visibleTodos.length} done
          </div>
        </div>
        <TodoForm
          title={todoForm.title}
          description={todoForm.description}
          assignedUserId={todoForm.assignedUserId}
          onChangeTitle={(val) => setTodoForm({ ...todoForm, title: val })}
          onChangeDescription={(val) => setTodoForm({ ...todoForm, description: val })}
          onChangeAssignedUserId={(val) => setTodoForm({ ...todoForm, assignedUserId: val })}
          onSubmit={onSubmitTodo}
          isLoading={todoLoading}
          isShared={workspace.kind === 'team'}
          members={selectedTeam?.members || []}
        />
      </section>

      {/* FULL WIDTH: WORKSPACE TASK BOARD / LIST */}
      <section className="panel board-panel-full">
        <div className="panel-heading flex-heading">
          <div>
            <p className="eyebrow">Today’s progress</p>
            <h2>Task Board</h2>
          </div>
          
          <div className="layout-mode-switcher">
            <button
              type="button"
              className={layoutMode === 'list' ? 'active' : 'secondary'}
              onClick={() => setLayoutMode('list')}
            >
              List View
            </button>
            <button
              type="button"
              className={layoutMode === 'board' ? 'active' : 'secondary'}
              onClick={() => setLayoutMode('board')}
            >
              Kanban Board
            </button>
          </div>
        </div>

        {/* ADVANCED FILTERS PANEL */}
        <div className="advanced-filters-panel">
          {/* Text Search */}
          <div className="filter-item search-filter">
            <label>Search</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks..."
            />
          </div>

          {/* Completed Tab Switcher (only relevant in List View) */}
          {layoutMode === 'list' && (
            <div className="filter-item">
              <label>Completion</label>
              <div className="filter-segmented-control">
                <button
                  type="button"
                  className={filter === 'all' ? 'active' : ''}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={filter === 'active' ? 'active' : ''}
                  onClick={() => setFilter('active')}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={filter === 'completed' ? 'active' : ''}
                  onClick={() => setFilter('completed')}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Priority filter */}
          <div className="filter-item">
            <label>Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Status filter (only list mode) */}
          {layoutMode === 'list' && (
            <div className="filter-item">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          )}

          {/* Assignee filter */}
          {workspace.kind === 'team' && (
            <div className="filter-item">
              <label>Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="all">All Assignees</option>
                {selectedTeam?.members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.userId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Due date filter */}
          <div className="filter-item">
            <label>Due Date</label>
            <select
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
            >
              <option value="all">Any Time</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="future">Future Tasks</option>
            </select>
          </div>
        </div>

        {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
        {todoLoading ? <p className="status-text">Loading tasks…</p> : null}

        {/* LAYOUT RENDERER */}
        {layoutMode === 'list' ? (
          <ul className="todo-list">
            {visibleTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggleTodo}
                onRemove={onRemoveTodo}
                isDeleting={pendingDeleteTodoId === todo.id}
                teamMembers={selectedTeam?.members || []}
                onAssign={onAssignTodo}
                onClickDetails={(id) => setSelectedTodoId(id)}
              />
            ))}
            {!todoLoading && visibleTodos.length === 0 ? (
              <li className="empty-state">No tasks match your filter parameters.</li>
            ) : null}
          </ul>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="kanban-board">
            {Object.entries(boardColumns).map(([colStatus, colTodos]) => (
              <div key={colStatus} className="kanban-column">
                <div className="kanban-column-header">
                  <h3>{colStatus.replace('_', ' ')}</h3>
                  <span className="kanban-column-count">{colTodos.length}</span>
                </div>
                <div className="kanban-column-body">
                  {colTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="kanban-card"
                      onClick={() => setSelectedTodoId(todo.id)}
                    >
                      <div className="kanban-card-title">{todo.title}</div>
                      {todo.description && (
                        <div className="kanban-card-desc">{todo.description}</div>
                      )}
                      
                      <div className="kanban-card-meta">
                        <span className={`badge-priority badge-priority-${todo.priority.toLowerCase()}`}>
                          {todo.priority}
                        </span>

                        {todo.dueDate && (
                          <span className="kanban-card-date">
                            📅 {new Date(todo.dueDate).toLocaleDateString()}
                          </span>
                        )}

                        <div className="kanban-card-counters">
                          {todo.comments && todo.comments.length > 0 && (
                            <span>💬 {todo.comments.length}</span>
                          )}
                          {todo.attachments && todo.attachments.length > 0 && (
                            <span>📎 {todo.attachments.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {colTodos.length === 0 && (
                    <div className="kanban-column-empty">No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TEAM SETTINGS */}
      {selectedTeam ? (
        <TeamCard
          selectedTeam={selectedTeam}
          currentRole={currentRole}
          user={user}
          teamNameEdit={teamNameEdit}
          onChangeTeamNameEdit={setTeamNameEdit}
          onRenameTeam={onRenameTeam}
          onDeleteTeam={onDeleteTeam}
          isDeletingTeam={pendingDeleteTeam}
          inviteEmail={inviteEmail}
          onChangeInviteEmail={setInviteEmail}
          onInviteMember={onInviteMember}
          onRevokeInvite={onRevokeInvite}
          isRevokingInviteId={pendingRevokeInviteId}
          onRemoveMember={onRemoveMember}
          isRemovingMemberId={pendingRemoveMemberId}
          canPerformAction={canPerformAction}
          getRoleLabel={getRoleLabel}
          teamError={teamError}
          teamMessage={teamMessage}
          onInviteAgain={onInviteAgain}
        />
      ) : null}

      {/* TASK DETAILS MODAL DRAWER OVERLAY */}
      {selectedTodoId && (
        <TaskDetailsDrawer
          todoId={selectedTodoId}
          currentUser={user}
          teamMembers={selectedTeam?.members || []}
          teamRole={currentRole}
          onClose={() => setSelectedTodoId(null)}
          onTaskUpdated={handleTaskUpdatedInDrawer}
        />
      )}
    </main>
  )
}
export default Dashboard
