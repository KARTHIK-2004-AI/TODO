import { type FormEvent } from 'react'
import { Input } from '../shared/Input'
import { Button } from '../shared/Button'

interface TodoFormProps {
  title: string
  description: string
  assignedUserId?: string
  dueDate?: string
  priority?: string
  onChangeTitle: (val: string) => void
  onChangeDescription: (val: string) => void
  onChangeAssignedUserId?: (val: string) => void
  onChangeDueDate?: (val: string) => void
  onChangePriority?: (val: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  isShared: boolean
  members?: Array<{ userId: string; user?: { name: string } }>
}

export function TodoForm({
  title,
  description,
  assignedUserId,
  dueDate = '',
  priority = 'MEDIUM',
  onChangeTitle,
  onChangeDescription,
  onChangeAssignedUserId,
  onChangeDueDate,
  onChangePriority,
  onSubmit,
  isLoading,
  isShared,
  members = [],
}: TodoFormProps) {
  return (
    <form className="todo-form flex flex-col gap-4 mt-2" onSubmit={onSubmit}>
      <Input
        id="title"
        label="Title"
        value={title}
        onChange={(event) => onChangeTitle(event.target.value)}
        placeholder="Finish dashboard polish"
        required
      />
      <Input
        id="description"
        label="Description"
        multiline
        rows={3}
        value={description}
        onChange={(event) => onChangeDescription(event.target.value)}
        placeholder="Add details for this task"
      />
      
      <div className="grid grid-cols-2 gap-3">
        {onChangePriority && (
          <div className="input-group">
            <label htmlFor="priority" className="input-label text-xs font-bold text-secondary uppercase">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => onChangePriority(e.target.value)}
              className="form-field w-full p-2.5 border border-divider rounded-xl bg-card text-foreground text-xs"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent 🔴</option>
            </select>
          </div>
        )}

        {onChangeDueDate && (
          <div className="input-group">
            <label htmlFor="dueDate" className="input-label text-xs font-bold text-secondary uppercase">Due Date</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate ? dueDate.split('T')[0] : ''}
              onChange={(e) => onChangeDueDate(e.target.value)}
              className="form-field w-full p-2.5 border border-divider rounded-xl bg-card text-foreground text-xs"
            />
          </div>
        )}
      </div>

      {isShared && members.length > 0 && onChangeAssignedUserId && (
        <div className="input-group">
          <label htmlFor="assignedUserId" className="input-label text-xs font-bold text-secondary uppercase">Assignee</label>
          <select
            id="assignedUserId"
            value={assignedUserId || ''}
            onChange={(event) => onChangeAssignedUserId(event.target.value)}
            className="form-field w-full p-2.5 border border-divider rounded-xl bg-card text-foreground text-xs"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || member.userId}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        {isShared ? 'Create Shared Task' : 'Add Task'}
      </Button>
    </form>
  )
}
