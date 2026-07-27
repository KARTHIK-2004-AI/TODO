import type { Todo, TeamMember } from '../types'

interface TodoItemProps {
  todo: Todo
  onToggle: (todo: Todo) => void
  onRemove: (id: string) => void
  isDeleting: boolean
  teamMembers?: TeamMember[]
  onAssign?: (todoId: string, assignedUserId: string | null) => void
  onClickDetails?: (id: string) => void
}

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  isDeleting,
  teamMembers = [],
  onAssign,
  onClickDetails,
}: TodoItemProps) {
  const assigneeId = todo.assignedToUserId || todo.assignedUserId
  const assignee = assigneeId
    ? teamMembers.find((m) => m.userId === assigneeId || m.user?.id === assigneeId)?.user
    : null

  // Format priority colors
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'badge-priority-low'
      case 'MEDIUM':
        return 'badge-priority-medium'
      case 'HIGH':
        return 'badge-priority-high'
      case 'URGENT':
        return 'badge-priority-urgent'
      default:
        return 'badge-priority-medium'
    }
  }

  // Format friendly due dates
  const formatFriendlyDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(d)
    target.setHours(0, 0, 0, 0)

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Overdue (Yesterday)'
    if (diffDays < -1) return `Overdue (${Math.abs(diffDays)} days ago)`
    if (diffDays > 1 && diffDays <= 3) return `${diffDays} days left`
    return d.toLocaleDateString()
  }

  const friendlyDue = formatFriendlyDate(todo.dueDate)

  const priority = todo.priority || 'MEDIUM'
  const status = todo.status || 'TODO'

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-main-wrapper">
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
        />
        <div className="todo-details-content" onClick={() => onClickDetails && onClickDetails(todo.id)}>
          <div className="todo-title-row">
            <span className="todo-title-text">{todo.title}</span>
            <div className="todo-badges-wrapper">
              <span className={`badge-priority ${getPriorityClass(priority)}`}>
                {priority}
              </span>
              <span className={`badge-status badge-status-${status.toLowerCase()}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          {todo.description ? <p className="todo-desc-text">{todo.description}</p> : null}
          
          <div className="todo-meta-row">
            {todo.teamId ? <span className="todo-badge">Shared</span> : null}
            
            {friendlyDue ? (
              <span className={`todo-due-badge ${friendlyDue.startsWith('Overdue') ? 'due-overdue' : 'due-future'}`}>
                📅 {friendlyDue}
              </span>
            ) : null}

            {todo.estimatedHours ? (
              <span className="todo-badge border-badge">
                ⏱️ {todo.estimatedHours}h
              </span>
            ) : null}

            {/* Comments and attachments counter */}
            {todo.comments && todo.comments.length > 0 ? (
              <span className="todo-badge border-badge">
                💬 {todo.comments.length}
              </span>
            ) : null}

            {todo.attachments && todo.attachments.length > 0 ? (
              <span className="todo-badge border-badge">
                📎 {todo.attachments.length}
              </span>
            ) : null}
            
            {todo.teamId && teamMembers.length > 0 && onAssign ? (
              <div className="todo-assignee-select" onClick={(e) => e.stopPropagation()}>
                <span>Assignee:</span>
                <select
                  value={assigneeId || ''}
                  onChange={(e) => onAssign(todo.id, e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name || m.userId}
                    </option>
                  ))}
                </select>
              </div>
            ) : assignee ? (
              <span className="todo-badge assignee-badge">
                👤 {assignee.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="delete"
        disabled={isDeleting}
        onClick={() => onRemove(todo.id)}
      >
        {isDeleting ? 'Removing…' : 'Remove'}
      </button>
    </li>
  )
}
export default TodoItem;
