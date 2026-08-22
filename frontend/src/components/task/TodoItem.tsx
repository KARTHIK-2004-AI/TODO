import type { Todo, TeamMember } from '../../types'
import { Badge } from '../shared/Badge'
import { Button } from '../shared/Button'
import { getPriorityVariant, formatFriendlyDate } from '../../utils/task'

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

  const friendlyDue = formatFriendlyDate(todo.dueDate)
  const priority = todo.priority || 'MEDIUM'
  const status = todo.status || 'TODO'

  return (
    <li className={`todo-item flex items-center justify-between p-3 border border-divider rounded-xl bg-card hover:bg-hover transition-all ${todo.completed ? 'completed opacity-70' : ''}`}>
      <div className="flex items-start gap-3 flex-grow">
        <label className="checkbox-container mt-1.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo)}
          />
          <span className="checkmark"></span>
        </label>
        
        <div className="flex-grow cursor-pointer" onClick={() => onClickDetails && onClickDetails(todo.id)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold text-foreground ${todo.completed ? 'line-through text-secondary' : ''}`}>
              {todo.title}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={getPriorityVariant(priority)}>
                {priority}
              </Badge>
              <Badge variant={status === 'DONE' ? 'success' : status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>
                {status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          
          {todo.description ? (
            <p className="text-xs text-secondary mt-1 line-clamp-1">{todo.description}</p>
          ) : null}
          
          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-secondary">
            {todo.teamId ? <span className="bg-surface px-1.5 py-0.5 rounded font-medium">Shared</span> : null}
            
            {friendlyDue ? (
              <span className={`font-semibold flex items-center gap-1 ${friendlyDue.startsWith('Overdue') ? 'text-danger' : ''}`}>
                📅 {friendlyDue}
              </span>
            ) : null}

            {todo.estimatedHours ? (
              <span className="flex items-center gap-1">
                ⏱️ {todo.estimatedHours}h
              </span>
            ) : null}

            {todo.comments && todo.comments.length > 0 ? (
              <span className="flex items-center gap-1">
                💬 {todo.comments.length}
              </span>
            ) : null}

            {todo.attachments && todo.attachments.length > 0 ? (
              <span className="flex items-center gap-1">
                📎 {todo.attachments.length}
              </span>
            ) : null}
            
            {todo.teamId && teamMembers.length > 0 && onAssign ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <span>Assignee:</span>
                <select
                  value={assigneeId || ''}
                  onChange={(e) => onAssign(todo.id, e.target.value || null)}
                  className="bg-surface border border-divider rounded text-[11px] p-0.5"
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
              <span className="font-semibold text-accent">
                👤 {assignee.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        disabled={isDeleting}
        onClick={() => onRemove(todo.id)}
        className="text-danger hover:bg-danger-light flex-shrink-0"
      >
        {isDeleting ? 'Removing…' : 'Remove'}
      </Button>
    </li>
  )
}
export default TodoItem;
