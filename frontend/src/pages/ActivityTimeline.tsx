/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { fetchActivity, fetchTeamActivity, fetchMyTeams } from '../api'
import type { ActivityLog, Team } from '../types'

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getActivityIcon(action: string): string {
  switch (action) {
    case 'TODO_CREATE': return '📝'
    case 'TODO_COMPLETE': return '✅'
    case 'TODO_UPDATE': return '✏️'
    case 'TODO_DELETE': return '🗑️'
    case 'TEAM_CREATE': return '👥'
    case 'TEAM_RENAME': return '🏷️'
    case 'TEAM_DELETE': return '❌'
    case 'TEAM_INVITE': return '✉️'
    case 'TEAM_ACCEPT_INVITE': return '👋'
    case 'TEAM_REMOVE_MEMBER': return '🚪'
    case 'TEAM_CHANGE_ROLE': return '🛡️'
    default: return '🔔'
  }
}

function getActivityText(log: ActivityLog): string {
  const userName = log.user?.name || 'Someone'
  const meta = log.metadata || {}
  const target = meta.title || meta.name || meta.targetName || meta.email || ''
  const team = meta.teamName ? `team "${meta.teamName}"` : ''

  switch (log.action) {
    case 'TODO_CREATE':
      return `${userName} created task "${target}" ${team ? `in ${team}` : '(private)'}`
    case 'TODO_COMPLETE':
      return `${userName} completed task "${target}" ${team ? `in ${team}` : '(private)'}`
    case 'TODO_UPDATE':
      return `${userName} updated task "${target}" ${team ? `in ${team}` : '(private)'}`
    case 'TODO_DELETE':
      return `${userName} deleted task "${target}" ${team ? `in ${team}` : '(private)'}`
    case 'TEAM_CREATE':
      return `${userName} created team "${target}"`
    case 'TEAM_RENAME':
      return `${userName} renamed team "${meta.oldName}" to "${meta.newName}"`
    case 'TEAM_DELETE':
      return `${userName} deleted team "${target}"`
    case 'TEAM_INVITE':
      return `${userName} invited ${target} to join team "${meta.teamName}"`
    case 'TEAM_ACCEPT_INVITE':
      return `${userName} joined team "${meta.teamName}"`
    case 'TEAM_REMOVE_MEMBER':
      return `${userName} removed ${target} from team "${meta.teamName}"`
    case 'TEAM_CHANGE_ROLE':
      return `${userName} changed role of ${target} to ${meta.newRole} in team "${meta.teamName}"`
    default:
      return `${userName} performed action ${log.action} on ${log.entityType}`
  }
}

export function ActivityTimeline() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTeams = async () => {
    try {
      const data = await fetchMyTeams()
      setTeams(data)
    } catch (err) {
      console.error('Error fetching teams for timeline filter:', err)
    }
  }

  const loadTimeline = async () => {
    setLoading(true)
    setError('')
    try {
      let res
      if (selectedTeamId === 'all') {
        res = await fetchActivity(page, 10, filterType || undefined)
      } else {
        res = await fetchTeamActivity(selectedTeamId, page, 10, filterType || undefined)
      }
      setLogs(res.data)
      setTotalPages(res.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  useEffect(() => {
    void loadTimeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, filterType, page])

  const handleScopeChange = (scope: string) => {
    setSelectedTeamId(scope)
    setPage(1)
  }

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    setPage(1)
  }

  return (
    <div className="panel timeline-panel">
      <div className="timeline-header-section">
        <h2 className="timeline-title">Activity Timeline</h2>
        <p className="timeline-subtitle">Track important workspace activities and events.</p>
      </div>

      <div className="timeline-filters-bar">
        <div className="filter-group-item">
          <label htmlFor="workspace-select">Workspace</label>
          <select
            id="workspace-select"
            value={selectedTeamId}
            onChange={(e) => handleScopeChange(e.target.value)}
          >
            <option value="all">All Workspaces (Unified)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Team)
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group-item">
          <label htmlFor="category-select">Category</label>
          <select
            id="category-select"
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Todo">Todos</option>
            <option value="Team">Teams</option>
            <option value="Invite">Invites</option>
            <option value="Role">Roles & Members</option>
          </select>
        </div>
      </div>

      <div className="timeline-content">
        {error && <div className="timeline-error-msg">{error}</div>}
        {loading && <div className="timeline-loading-msg">Loading activity logs...</div>}

        {!loading && logs.length === 0 && (
          <div className="timeline-empty-state">
            <span className="empty-graphic">📜</span>
            <p>No activity logs found for this filter combination.</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="timeline-list">
            <div className="timeline-line" />
            {logs.map((log) => (
              <div key={log.id} className="timeline-item-card">
                <div className="timeline-item-icon" title={log.action}>
                  {getActivityIcon(log.action)}
                </div>
                <div className="timeline-item-details">
                  <p className="timeline-item-text">{getActivityText(log)}</p>
                  <div className="timeline-item-footer">
                    <span className="timeline-item-time">
                      {formatTimestamp(log.createdAt)}
                    </span>
                    {log.teamId && (
                      <span className="timeline-item-tag">
                        Team
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="timeline-pagination">
          <button
            type="button"
            className="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
