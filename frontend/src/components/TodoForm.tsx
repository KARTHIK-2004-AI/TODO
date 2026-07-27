import { type FormEvent } from 'react'

interface TodoFormProps {
  title: string
  description: string
  assignedUserId?: string
  onChangeTitle: (val: string) => void
  onChangeDescription: (val: string) => void
  onChangeAssignedUserId?: (val: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  isShared: boolean
  members?: Array<{ userId: string; user?: { name: string } }>
}

export function TodoForm({
  title,
  description,
  assignedUserId,
  onChangeTitle,
  onChangeDescription,
  onChangeAssignedUserId,
  onSubmit,
  isLoading,
  isShared,
  members = [],
}: TodoFormProps) {
  return (
    <form className="todo-form" onSubmit={onSubmit}>
      <div className="field-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={(event) => onChangeTitle(event.target.value)}
          placeholder="Finish dashboard polish"
        />
      </div>
      <div className="field-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
          placeholder="Add details for this task"
          rows={4}
        />
      </div>
      {isShared && members.length > 0 && onChangeAssignedUserId && (
        <div className="field-group">
          <label htmlFor="assignedUserId">Assignee</label>
          <select
            id="assignedUserId"
            value={assignedUserId || ''}
            onChange={(event) => onChangeAssignedUserId(event.target.value)}
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
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving…' : isShared ? 'Create shared todo' : 'Add todo'}
      </button>
    </form>
  )
}
