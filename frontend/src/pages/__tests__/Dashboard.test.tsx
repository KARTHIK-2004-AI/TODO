import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import type { User, Todo } from '../../types'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
}

const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    title: 'First task',
    description: 'First task description',
    completed: false,
    userId: 'user-1',
    priority: 'HIGH',
    status: 'TODO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('Dashboard Component', () => {
  it('renders Dashboard workspace elements and task lists', () => {
    const mockSetWorkspace = vi.fn()
    const mockSetTeamForm = vi.fn()
    const mockOnCreateTeam = vi.fn()
    const mockSetTodoForm = vi.fn()
    const mockOnSubmitTodo = vi.fn()
    const mockSetFilter = vi.fn()
    const mockSetQuery = vi.fn()
    const mockSetTeamNameEdit = vi.fn()
    const mockOnRenameTeam = vi.fn()
    const mockOnDeleteTeam = vi.fn()
    const mockSetInviteEmail = vi.fn()
    const mockOnInviteMember = vi.fn()
    const mockOnRevokeInvite = vi.fn()
    const mockOnRemoveMember = vi.fn()
    const mockOnToggleTodo = vi.fn()
    const mockOnRemoveTodo = vi.fn()
    const mockCanPerformAction = vi.fn(() => false)
    const mockGetRoleLabel = vi.fn((role) => role)

    render(
      <Dashboard
        user={mockUser}
        workspace={{ kind: 'private' }}
        setWorkspace={mockSetWorkspace}
        teams={[]}
        teamForm={{ name: '', description: '', purpose: '' }}
        setTeamForm={mockSetTeamForm}
        onCreateTeam={mockOnCreateTeam}
        teamError=""
        teamMessage=""
        todoForm={{ title: '', description: '', assignedUserId: '' }}
        setTodoForm={mockSetTodoForm}
        todoLoading={false}
        onSubmitTodo={mockOnSubmitTodo}
        filter="all"
        setFilter={mockSetFilter}
        query=""
        setQuery={mockSetQuery}
        statusMessage=""
        visibleTodos={mockTodos}
        completedCount={0}
        selectedTeam={null}
        currentRole={undefined}
        teamNameEdit=""
        setTeamNameEdit={mockSetTeamNameEdit}
        onRenameTeam={mockOnRenameTeam}
        onDeleteTeam={mockOnDeleteTeam}
        pendingDeleteTeam={false}
        inviteEmail=""
        setInviteEmail={mockSetInviteEmail}
        onInviteMember={mockOnInviteMember}
        onRevokeInvite={mockOnRevokeInvite}
        pendingRevokeInviteId={null}
        onRemoveMember={mockOnRemoveMember}
        pendingRemoveMemberId={null}
        pendingDeleteTodoId={null}
        onToggleTodo={mockOnToggleTodo}
        onRemoveTodo={mockOnRemoveTodo}
        canPerformAction={mockCanPerformAction}
        getRoleLabel={mockGetRoleLabel}
        
        priorityFilter="all"
        setPriorityFilter={vi.fn()}
        statusFilter="all"
        setStatusFilter={vi.fn()}
        assigneeFilter="all"
        setAssigneeFilter={vi.fn()}
        dueFilter="all"
        setDueFilter={vi.fn()}
        onReloadTodos={vi.fn()}
      />
    )

    expect(screen.getByText(/private/i)).toBeInTheDocument()
    expect(screen.getByText(/^First task$/i)).toBeInTheDocument()
  })
})
