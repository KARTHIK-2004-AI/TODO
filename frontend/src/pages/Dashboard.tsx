import { type FormEvent } from 'react'
import type { Team, TeamMember, TeamRole, Todo, User, WorkspaceSelection } from '../types'
import { TodoForm } from '../components/TodoForm'
import { TodoItem } from '../components/TodoItem'
import { TeamCard } from '../components/TeamCard'

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
}: DashboardProps) {
  const handleCreateTeamSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCreateTeam()
  }

  return (
    <main className="content-grid">
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

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Today’s progress</p>
            <h2>Task list</h2>
          </div>
          <div className="filters">
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
              Completed
            </button>
          </div>
        </div>
        <div className="search-box">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search todos"
          />
        </div>
        {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
        {todoLoading ? <p className="status-text">Loading tasks…</p> : null}
        <ul className="todo-list">
          {visibleTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              onRemove={onRemoveTodo}
              isDeleting={pendingDeleteTodoId === todo.id}
              teamMembers={selectedTeam?.members || []}
              onAssign={
                (currentRole === 'OWNER' || currentRole === 'ADMIN') && onAssignTodo
                  ? onAssignTodo
                  : undefined
              }
            />
          ))}
          {!todoLoading && visibleTodos.length === 0 ? (
            <li className="empty-state">No todos match this view yet.</li>
          ) : null}
        </ul>
      </section>

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
    </main>
  )
}
export default Dashboard
