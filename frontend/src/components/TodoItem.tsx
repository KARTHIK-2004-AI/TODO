import type { Todo, TeamMember } from '../types'

interface TodoItemProps {
  todo: Todo
  onToggle: (todo: Todo) => void
  onRemove: (id: string) => void
  isDeleting: boolean
  teamMembers?: TeamMember[]
  onAssign?: (todoId: string, assignedUserId: string | null) => void
}

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  isDeleting,
  teamMembers = [],
  onAssign,
}: TodoItemProps) {
  const assignee = todo.assignedUserId
    ? teamMembers.find((m) => m.userId === todo.assignedUserId)?.user
    : null

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <label className="todo-main">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
        />
        <div>
          <strong>{todo.title}</strong>
          {todo.description ? <p>{todo.description}</p> : null}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
            {todo.teamId ? <span className="todo-badge">Shared</span> : null}
            {todo.teamId && teamMembers.length > 0 && onAssign ? (
              <div className="todo-assignee-select" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>Assignee:</span>
                <select
                  value={todo.assignedUserId || ''}
                  onChange={(e) => onAssign(todo.id, e.target.value || null)}
                  style={{ fontSize: '0.75rem', padding: '1px 3px', borderRadius: '4px', border: '1px solid #ddd', background: '#f9f9f9' }}
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
              <span className="todo-badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                👤 {assignee.name}
              </span>
            ) : null}
          </div>
        </div>
      </label>
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
