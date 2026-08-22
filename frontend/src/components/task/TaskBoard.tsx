import { useMemo } from 'react'
import type { Todo, TeamMember } from '../../types'
import { TaskCard } from './TaskCard'

interface TaskBoardProps {
  todos: Todo[]
  onToggle: (todo: Todo) => void
  onClickDetails: (id: string) => void
  teamMembers?: TeamMember[]
}

export function TaskBoard({ todos, onToggle, onClickDetails, teamMembers = [] }: TaskBoardProps) {
  const columns = useMemo(() => {
    return {
      TODO: {
        title: 'To Do',
        color: '#64748b',
        tasks: todos.filter((t) => t.status === 'TODO'),
      },
      IN_PROGRESS: {
        title: 'In Progress',
        color: '#3b82f6',
        tasks: todos.filter((t) => t.status === 'IN_PROGRESS'),
      },
      IN_REVIEW: {
        title: 'In Review',
        color: '#f59e0b',
        tasks: todos.filter((t) => t.status === 'IN_REVIEW'),
      },
      DONE: {
        title: 'Done',
        color: '#10b981',
        tasks: todos.filter((t) => t.status === 'DONE'),
      },
    }
  }, [todos])

  return (
    <div className="kanban-board-layout grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 overflow-x-auto animated-fade-in">
      {Object.entries(columns).map(([key, col]) => (
        <div key={key} className="kanban-column bg-surface/50 border border-divider rounded-xl p-3.5 flex flex-col gap-3 min-w-[250px] max-h-[700px]">
          <div className="column-header flex justify-between items-center pb-2 border-b border-divider/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
            </div>
            <span className="text-xs font-bold text-secondary bg-surface border border-divider px-2 py-0.5 rounded-full">
              {col.tasks.length}
            </span>
          </div>

          <div className="column-tasks-container flex-grow overflow-y-auto space-y-3 pr-1">
            {col.tasks.length === 0 ? (
              <div className="empty-column-placeholder text-center text-xs text-secondary py-8 border border-dashed border-divider rounded-xl">
                No tasks here
              </div>
            ) : (
              col.tasks.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onClickDetails={onClickDetails}
                  teamMembers={teamMembers}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
