import type { Todo, TeamMember } from '../../types'
import { Badge } from '../shared/Badge'
import { Avatar } from '../shared/Avatar'
import { getPriorityVariant, formatFriendlyDate } from '../../utils/task'

interface TaskCardProps {
  todo: Todo
  onToggle: (todo: Todo) => void
  onClickDetails: (id: string) => void
  teamMembers?: TeamMember[]
}

export function TaskCard({ todo, onToggle, onClickDetails, teamMembers = [] }: TaskCardProps) {
  const assigneeId = todo.assignedToUserId || todo.assignedUserId
  const assignee = assigneeId
    ? teamMembers.find((m) => m.userId === assigneeId || m.user?.id === assigneeId)?.user
    : null

  const friendlyDue = formatFriendlyDate(todo.dueDate)

  return (
    <div
      className={`kanban-task-card bg-card border border-divider rounded-xl p-3.5 hover:shadow-md cursor-pointer transition-all flex flex-col gap-3 ${todo.completed ? 'opacity-70' : ''}`}
      onClick={() => onClickDetails(todo.id)}
    >
      <div className="flex justify-between items-start gap-2">
        <label className="checkbox-container flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo)}
          />
          <span className="checkmark"></span>
        </label>
        
        <h4 className={`text-sm font-semibold text-foreground flex-grow break-all line-clamp-2 ${todo.completed ? 'line-through text-secondary' : ''}`}>
          {todo.title}
        </h4>
      </div>

      {todo.description ? (
        <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{todo.description}</p>
      ) : null}

      <div className="flex justify-between items-center mt-1.5 flex-wrap gap-2 pt-2 border-t border-divider">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={getPriorityVariant(todo.priority)}>
            {todo.priority}
          </Badge>
          
          {friendlyDue ? (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-secondary ${friendlyDue === 'Overdue' || friendlyDue === 'Today' ? 'text-danger bg-danger-light' : ''}`}>
              📅 {friendlyDue}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {todo.comments && todo.comments.length > 0 ? (
            <span className="text-[10px] text-secondary">💬 {todo.comments.length}</span>
          ) : null}
          {todo.attachments && todo.attachments.length > 0 ? (
            <span className="text-[10px] text-secondary">📎 {todo.attachments.length}</span>
          ) : null}
          <Avatar src={assignee?.avatarUrl} name={assignee?.name || 'Unassigned'} size={24} />
        </div>
      </div>
    </div>
  )
}
