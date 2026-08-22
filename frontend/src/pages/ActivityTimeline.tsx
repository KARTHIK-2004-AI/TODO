/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { fetchActivity, fetchTeamActivity, fetchMyTeams } from '../api'
import type { ActivityLog, Team } from '../types'
import { getActivityIcon, getActivityText } from '../utils/task'
import { formatTimestamp } from '../utils/time'


export function ActivityTimeline({ workspaceId }: { workspaceId?: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>(workspaceId || 'all')
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

  // Sync selectedTeamId if workspaceId prop shifts
  useEffect(() => {
    if (workspaceId) {
      setSelectedTeamId(workspaceId)
      setPage(1)
    }
  }, [workspaceId])

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
        {!workspaceId && (
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
        )}

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
