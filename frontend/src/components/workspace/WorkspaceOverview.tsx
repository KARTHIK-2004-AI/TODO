import { useEffect, useState, useMemo } from 'react'
import type { Todo, User, WorkspaceSelection, ActivityLog, TeamMember } from '../../types'
import { Card } from '../shared/Card'
import { Badge } from '../shared/Badge'
import { Avatar } from '../shared/Avatar'
import { fetchActivity, fetchTeamActivity } from '../../api'
import { TeamChat } from '../chat/TeamChat'
import { getActivityText } from '../../utils/task'
import { formatTimeAgo } from '../../utils/time'

interface WorkspaceOverviewProps {
  user: User
  workspace: WorkspaceSelection
  todos: Todo[]
  onToggleTodo: (todo: Todo) => void
  onSelectTodo: (id: string) => void
  onAddTaskClick: () => void
  activeSubTab: string
  setActiveSubTab: (tab: any) => void
  teamMembers: TeamMember[]
}

export function WorkspaceOverview({
  user,
  workspace,
  todos,
  onToggleTodo,
  onSelectTodo,
  onAddTaskClick,
  activeSubTab: _activeSubTab,
  setActiveSubTab,
  teamMembers,
}: WorkspaceOverviewProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  // Fetch recent activity for this workspace
  useEffect(() => {
    let active = true
    const loadRecentActivity = async () => {
      setLoadingActivity(true)
      try {
        let res
        if (workspace.kind === 'private') {
          res = await fetchActivity(1, 5)
        } else {
          res = await fetchTeamActivity(workspace.teamId, 1, 5)
        }
        if (active && res && res.data) {
          setActivities(res.data)
        }
      } catch (err) {
        console.error('Error loading activity for overview:', err)
      } finally {
        if (active) setLoadingActivity(false)
      }
    }
    loadRecentActivity()
    return () => {
      active = false
    }
  }, [workspace])

  // Compute metrics
  const pendingCount = useMemo(() => todos.filter((t) => !t.completed && t.status !== 'DONE').length, [todos])
  const inProgressCount = useMemo(() => todos.filter((t) => t.status === 'IN_PROGRESS').length, [todos])
  const completedCount = useMemo(() => todos.filter((t) => t.completed || t.status === 'DONE').length, [todos])
  const overdueCount = useMemo(() => {
    const now = new Date()
    return todos.filter((t) => !t.completed && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length
  }, [todos])

  // Filter tasks for "Today's Tasks" - tasks due today, or high/urgent priority tasks that are pending
  const todayTasks = useMemo(() => {
    const todayStr = new Date().toDateString()
    return todos
      .filter((t) => {
        if (t.completed || t.status === 'DONE') return false
        if (t.dueDate && new Date(t.dueDate).toDateString() === todayStr) return true
        return t.priority === 'HIGH' || t.priority === 'URGENT'
      })
      .slice(0, 4)
  }, [todos])

  // Filter tasks for "Upcoming Deadlines" - tasks that have a due date in the future and are not completed
  const upcomingDeadlines = useMemo(() => {
    const now = new Date()
    return [...todos]
      .filter((t) => !t.completed && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 4)
  }, [todos])

  const getDeadlineBadgeText = (dueDateStr: string) => {
    const due = new Date(dueDateStr)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (due.toDateString() === today.toDateString()) return 'Today'
    if (due.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getDeadlineBadgeVariant = (dueDateStr: string) => {
    const due = new Date(dueDateStr)
    const today = new Date()
    if (due.toDateString() === today.toDateString()) return 'danger'
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    if (due.toDateString() === tomorrow.toDateString()) return 'warning'
    return 'neutral'
  }

  return (
    <div className="workspace-overview animated-fade-in">
      {/* 1. METRICS GRID ROW */}
      <div className="overview-metrics-grid">
        <Card className="metric-card">
          <div className="metric-icon-wrapper bklit-metric-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">My Tasks</span>
            <div className="metric-value-row">
              <span className="metric-value bklit-mono">{pendingCount}</span>
            </div>
            <span className="metric-description">Pending tasks</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper bklit-metric-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">In Progress</span>
            <div className="metric-value-row">
              <span className="metric-value bklit-mono">{inProgressCount}</span>
            </div>
            <span className="metric-description">Tasks in progress</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper bklit-metric-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">Completed</span>
            <div className="metric-value-row">
              <span className="metric-value bklit-mono">{completedCount}</span>
            </div>
            <span className="metric-description">Tasks completed</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper bklit-metric-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">Overdue</span>
            <div className="metric-value-row">
              <span className="metric-value bklit-mono">{overdueCount}</span>
            </div>
            <span className="metric-description">Tasks overdue</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper bklit-metric-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">Focus Time</span>
            <div className="metric-value-row">
              <span className="metric-value bklit-mono">2.4h</span>
            </div>
            <span className="metric-description">Focus sessions logged</span>
          </div>
        </Card>
      </div>

      {/* 2. SUB-SECTION COLUMNS GRID */}
      <div className="overview-content-grid">
        {/* Column 1: Today's Tasks & Workspace Chat */}
        <div className="overview-column flex flex-col gap-5">
          <Card
            title="Today's Tasks"
            headerActions={
              <button type="button" className="btn-link-actions" onClick={() => setActiveSubTab('tasks')}>
                View all
              </button>
            }
            className="overview-panel-card"
          >
            <div className="today-tasks-list">
              {todayTasks.length === 0 ? (
                <div className="empty-overview-item">No urgent tasks for today.</div>
              ) : (
                todayTasks.map((todo) => (
                  <div key={todo.id} className="today-task-row">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => onToggleTodo(todo)}
                      />
                      <span className="checkmark"></span>
                    </label>
                    <span
                      className={`task-title-link truncate ${todo.completed ? 'completed' : ''}`}
                      onClick={() => onSelectTodo(todo.id)}
                    >
                      {todo.title}
                    </span>
                    <div className="task-row-meta">
                      <Badge variant={todo.priority === 'URGENT' || todo.priority === 'HIGH' ? 'danger' : 'neutral'}>
                        {todo.priority}
                      </Badge>
                      <Avatar name={todo.assignedToUserId || user.name} size={24} />
                    </div>
                  </div>
                ))
              )}
              <button type="button" className="add-task-inline-btn" onClick={onAddTaskClick}>
                <span className="btn-icon">+</span> Add new task
              </button>
            </div>
          </Card>

          {workspace.kind === 'team' && (
            <Card title="Workspace Chat" className="overview-panel-card dashboard-chat-card-embedded" style={{ padding: '16px 20px', overflow: 'hidden' }}>
              <TeamChat teamId={workspace.teamId} currentUser={user} teamMembers={teamMembers} isEmbedded={true} />
            </Card>
          )}
        </div>

        {/* Column 2: Upcoming Deadlines */}
        <div className="overview-column flex flex-col gap-5">
          <Card
            title="Upcoming Deadlines"
            headerActions={
              <button type="button" className="btn-link-actions" onClick={() => setActiveSubTab('tasks')}>
                View all
              </button>
            }
            className="overview-panel-card"
          >
            <div className="deadlines-list">
              {upcomingDeadlines.length === 0 ? (
                <div className="empty-overview-item">No upcoming deadlines found.</div>
              ) : (
                upcomingDeadlines.map((todo) => (
                  <div key={todo.id} className="deadline-row" onClick={() => onSelectTodo(todo.id)}>
                    <div className="deadline-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div className="deadline-details truncate">
                      <span className="deadline-title truncate">{todo.title}</span>
                      <span className="deadline-project truncate">
                        {workspace.kind === 'private' ? 'Personal Space' : 'Team Project'}
                      </span>
                    </div>
                    <Badge variant={getDeadlineBadgeVariant(todo.dueDate!)}>
                      {getDeadlineBadgeText(todo.dueDate!)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Column 3: Recent Activity */}
        <div className="overview-column flex flex-col gap-5">
          <Card
            title="Recent Activity"
            headerActions={
              <button type="button" className="btn-link-actions" onClick={() => setActiveSubTab('timeline')}>
                View all
              </button>
            }
            className="overview-panel-card"
          >
            <div className="overview-activity-list">
              {loadingActivity ? (
                <div className="loading-overview-item">Loading logs...</div>
              ) : activities.length === 0 ? (
                <div className="empty-overview-item">No activities recorded yet.</div>
              ) : (
                activities.map((log) => (
                  <div key={log.id} className="overview-activity-row">
                    <Avatar name={log.user?.name || 'Someone'} src={log.user?.avatarUrl} size={26} />
                    <div className="activity-info truncate">
                      <p className="activity-text truncate">{getActivityText(log)}</p>
                      <span className="activity-time">{formatTimeAgo(log.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
