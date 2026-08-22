import { useState, useEffect, useCallback } from 'react'
import { fetchTodos } from '../../api'
import type { Todo, Team, TaskPriority } from '../../types'
import { Card } from '../shared/Card'
import './TeamCalendar.css'

interface TeamCalendarProps {
  selectedTeam?: Team | null
  todosProps?: Todo[]
  onSelectTodo: (id: string) => void
  onAddTaskOnDate?: (date: Date) => void
}

export function TeamCalendar({ selectedTeam, todosProps, onSelectTodo, onAddTaskOnDate }: TeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [todos, setTodos] = useState<Todo[]>(todosProps || [])
  const [loading, setLoading] = useState(!todosProps)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const loadTodos = useCallback(async () => {
    if (todosProps) {
      setTodos(todosProps)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchTodos(undefined, undefined, selectedTeam?.id)
      setTodos(data)
    } catch (err) {
      console.error('Failed to load calendar todos:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTeam?.id, todosProps])

  useEffect(() => {
    if (todosProps) {
      setTodos(todosProps)
      setLoading(false)
    } else {
      void loadTodos()
    }
  }, [loadTodos, todosProps])

  // Real-time synchronization
  useEffect(() => {
    const handleWsEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const wsMessage = customEvent.detail
      if (!wsMessage || !wsMessage.eventType) return
      const { eventType, workspaceId } = wsMessage

      if (
        eventType === 'TASK_CREATED' ||
        eventType === 'TASK_UPDATED' ||
        eventType === 'TASK_DELETED'
      ) {
        if (!selectedTeam || workspaceId === selectedTeam.id) {
          void loadTodos()
        }
      }
    }

    window.addEventListener('ws:event', handleWsEvent)
    return () => window.removeEventListener('ws:event', handleWsEvent)
  }, [selectedTeam?.id, loadTodos])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Get calendar details
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getPriorityColorClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'priority-urgent'
      case 'HIGH': return 'priority-high'
      case 'MEDIUM': return 'priority-medium'
      case 'LOW': return 'priority-low'
      default: return 'priority-medium'
    }
  }

  // Get total days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  // Day of week of first day of month (0 = Sunday, 1 = Monday, ...)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()

  const calendarDays: Array<{ date: Date | null; isToday: boolean; isCurrentMonth: boolean }> = []

  // Trailing days from previous month
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1, prevMonthDays - i)
    calendarDays.push({
      date: d,
      isToday: false,
      isCurrentMonth: false
    })
  }

  // Current month days
  const todayDate = new Date()
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentYear, currentMonth, i)
    const isToday =
      todayDate.getDate() === i &&
      todayDate.getMonth() === currentMonth &&
      todayDate.getFullYear() === currentYear

    calendarDays.push({
      date: d,
      isToday,
      isCurrentMonth: true
    })
  }

  // Leading days of next month to fill grid row
  const totalSlotsNeeded = Math.ceil(calendarDays.length / 7) * 7
  const nextMonthPadding = totalSlotsNeeded - calendarDays.length
  for (let i = 1; i <= nextMonthPadding; i++) {
    const d = new Date(currentYear, currentMonth + 1, i)
    calendarDays.push({
      date: d,
      isToday: false,
      isCurrentMonth: false
    })
  }

  // Helper to match todos to a calendar date
  const getTodosForDate = (date: Date) => {
    const targetY = date.getFullYear()
    const targetM = date.getMonth()
    const targetD = date.getDate()

    return todos.filter((todo) => {
      if (!todo.dueDate) return false
      const d = new Date(todo.dueDate)
      const localMatch = d.getFullYear() === targetY && d.getMonth() === targetM && d.getDate() === targetD
      const utcMatch = d.getUTCFullYear() === targetY && d.getUTCMonth() === targetM && d.getUTCDate() === targetD
      return localMatch || utcMatch
    })
  }

  return (
    <div className="team-calendar-wrapper animated-fade-in">
      <Card className="calendar-card">
        {/* Header navigation bar */}
        <div className="calendar-header">
          <div className="calendar-title-group">
            <h2 className="text-lg font-bold text-foreground">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-xs text-secondary">
              Workspace schedules and timelines for {selectedTeam ? selectedTeam.name : 'Personal Workspace'}
            </p>
          </div>
          <div className="calendar-actions">
            <button type="button" className="calendar-today-btn" onClick={handleToday}>
              Today
            </button>
            <div className="calendar-btn-group">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                &larr;
              </button>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handleNextMonth}
                title="Next Month"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="calendar-loading flex items-center justify-center py-20 text-secondary text-sm">
            Loading scheduled items...
          </div>
        ) : (
          <div className="calendar-grid-container mt-4">
            {/* Weekday labels */}
            <div className="calendar-weekday-row">
              {daysOfWeek.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            {/* Calendar days grid */}
            <div className="calendar-grid">
              {calendarDays.map(({ date, isToday, isCurrentMonth }, idx) => {
                if (!date) return <div key={idx} className="day-cell empty"></div>

                const dayTodos = getTodosForDate(date)

                return (
                  <div
                    key={idx}
                    className={`day-cell flex flex-col p-2 min-h-[100px] bg-card relative ${
                      isCurrentMonth ? 'current-month' : 'other-month text-muted'
                    } ${isToday ? 'today' : ''}`}
                  >
                    <div className="day-header flex justify-between items-center mb-2">
                      {isToday && <span className="today-badge text-[9px] font-bold px-1.5 py-0.5 bg-accent text-white rounded-full">TODAY</span>}
                      <span className={`day-number text-xs font-bold ${isToday ? 'text-accent' : 'text-foreground/80'}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="day-todo-list flex flex-col gap-1 overflow-y-auto max-h-[70px] pr-0.5">
                      {dayTodos.map((todo) => (
                        <button
                          key={todo.id}
                          type="button"
                          className={`todo-calendar-badge truncate text-left text-[10px] font-medium px-2 py-1 rounded ${getPriorityColorClass(todo.priority)} ${todo.completed ? 'completed' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectTodo(todo.id)
                          }}
                          title={`${todo.title} (${todo.priority})`}
                        >
                          {todo.title}
                        </button>
                      ))}
                    </div>

                    {/* Quick Add Plan hover trigger */}
                    {isCurrentMonth && onAddTaskOnDate && (
                      <button
                        type="button"
                        className="day-add-btn absolute bottom-2 right-2 opacity-0 hover:scale-105 active:scale-95 transition-all text-xs font-bold bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center cursor-pointer shadow-sm"
                        onClick={() => onAddTaskOnDate(date)}
                        title="Schedule Task"
                      >
                        +
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
