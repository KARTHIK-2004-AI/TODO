import type { Todo, TeamMember } from '../../types'
import { TodoItem } from './TodoItem'
import { EmptyState } from '../shared/EmptyState'

interface TaskListProps {
  todos: Todo[]
  onToggle: (todo: Todo) => void
  onRemove: (id: string) => void
  isDeletingId: string | null
  teamMembers?: TeamMember[]
  onAssign?: (todoId: string, assignedUserId: string | null) => void
  onClickDetails?: (id: string) => void
}

export function TaskList({
  todos,
  onToggle,
  onRemove,
  isDeletingId,
  teamMembers = [],
  onAssign,
  onClickDetails,
}: TaskListProps) {
  if (todos.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No tasks found"
        description="Get started by creating a new task using the input form or quick actions."
      />
    )
  }

  return (
    <ul className="todo-list flex flex-col gap-2.5 list-none p-0 m-0 animated-fade-in">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRemove={onRemove}
          isDeleting={isDeletingId === todo.id}
          teamMembers={teamMembers}
          onAssign={onAssign}
          onClickDetails={onClickDetails}
        />
      ))}
    </ul>
  )
}
