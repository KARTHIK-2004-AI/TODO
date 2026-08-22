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
          <div className="metric-icon-wrapper purple-bg">📋</div>
          <div className="metric-content">
            <span className="metric-label">My Tasks</span>
            <div className="metric-value-row">
              <span className="metric-value">{pendingCount}</span>
            </div>
            <span className="metric-description">Pending tasks</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper blue-bg">⏳</div>
          <div className="metric-content">
            <span className="metric-label">In Progress</span>
            <div className="metric-value-row">
              <span className="metric-value">{inProgressCount}</span>
            </div>
            <span className="metric-description">Tasks in progress</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper green-bg">✅</div>
          <div className="metric-content">
            <span className="metric-label">Completed</span>
            <div className="metric-value-row">
              <span className="metric-value">{completedCount}</span>
            </div>
            <span className="metric-description">Tasks completed</span>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-icon-wrapper red-bg">⚠️</div>
          <div className="metric-content">
            <span className="metric-label">Overdue</span>
            <div className="metric-value-row">
              <span className="metric-value">{overdueCount}</span>
            </div>
            <span className="metric-description">Tasks overdue</span>
          </div>
        </Card>

        <Card className="metric-card font-semibold">
          <div className="metric-icon-wrapper dark-bg">⚡</div>
          <div className="metric-content">
            <span className="metric-label">Focus Time</span>
            <div className="metric-value-row">
              <span className="metric-value">2.4h</span>
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
                <div className="empty-overview-item">🎉 No urgent tasks for today!</div>
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
                    <div className="deadline-icon">📅</div>
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

        {/* Column 3: Recent Activity & Quick Actions */}
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

            <Card title="Quick Actions" className="overview-panel-card quick-actions-card-wrapper" style={{ padding: '20px 24px' }}>
              <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <button type="button" className="quick-action-btn" onClick={onAddTaskClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>📝</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Create Task</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/files' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>📁</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Upload File</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/members' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>👥</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Invite Member</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/chat' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>💬</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Start Chat</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/tasks' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>💼</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>View All Tasks</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/calendar' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>📅</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>View Calendar</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/settings' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>⚙️</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Workspace Settings</span>
                </button>
                <button type="button" className="quick-action-btn" onClick={() => { window.location.hash = '#/reports' }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: '12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.5rem', padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>📊</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>View Reports</span>
                </button>
              </div>
            </Card>
        </div>
      </div>
    </div>
  )
}
