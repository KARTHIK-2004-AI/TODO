import { useMemo, useEffect, useState } from 'react'
import { fetchTodos } from '../../api'
import type { Team, Todo } from '../../types'
import { Card } from '../shared/Card'

interface TeamAnalyticsProps {
  selectedTeam: Team
  todos?: Todo[]
}

export function TeamAnalytics({ selectedTeam }: TeamAnalyticsProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchTodos(undefined, undefined, selectedTeam.id)
      .then((data) => {
        if (active) {
          setTodos(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch analytics data:', err)
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [selectedTeam.id])

  const boardColumns = useMemo(() => ({
    TODO: todos.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: todos.filter((t) => t.status === 'IN_PROGRESS'),
    IN_REVIEW: todos.filter((t) => t.status === 'IN_REVIEW'),
    DONE: todos.filter((t) => t.status === 'DONE'),
  }), [todos])

  // Analytics Helpers
  const inProgressCount = boardColumns.IN_PROGRESS.length
  const todoCount = boardColumns.TODO.length
  const inReviewCount = boardColumns.IN_REVIEW.length
  const completedCount = boardColumns.DONE.length

  const overdueCount = useMemo(() => {
    const now = new Date()
    return todos.filter((t) => !t.completed && t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length
  }, [todos])

  // Chart data: coordinates mapping for To Do, In Progress, In Review, Done
  const chartCoordinates = useMemo(() => {
    const values = [todoCount, inProgressCount, inReviewCount, completedCount]
    const maxVal = Math.max(...values, 4) // scale up to at least 4 items
    const points = values.map((val, index) => {
      const x = 40 + index * 80
      const y = 100 - (val / maxVal) * 70
      return { x, y, count: val }
    })
    return points
  }, [todoCount, inProgressCount, inReviewCount, completedCount])

  const chartPathStr = useMemo(() => {
    if (chartCoordinates.length === 0) return ''
    const first = chartCoordinates[0]
    let path = `M ${first.x} ${first.y}`
    for (let i = 1; i < chartCoordinates.length; i++) {
      const p = chartCoordinates[i]
      const prev = chartCoordinates[i - 1]
      // Draw smooth bezier curve points
      const cpX1 = prev.x + 40
      const cpY1 = prev.y
      const cpX2 = p.x - 40
      const cpY2 = p.y
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`
    }
    return path
  }, [chartCoordinates])

  const fillPathStr = useMemo(() => {
    if (!chartPathStr) return ''
    return `${chartPathStr} L 280 110 L 40 110 Z`
  }, [chartPathStr])

  if (loading) {
    return (
      <div className="workspace-analytics-tab animated-fade-in flex items-center justify-center py-20 text-secondary text-sm bg-card border border-divider rounded-xl">
        Loading workspace analytics...
      </div>
    )
  }

  return (
    <div className="workspace-analytics-tab animated-fade-in flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="metric-card bg-card border border-divider p-4 rounded-xl">
          <span className="block text-2xl font-extrabold text-foreground">{todos.length}</span>
          <span className="text-xs text-secondary font-medium">Total Active Tasks</span>
        </Card>
        <Card className="metric-card bg-card border border-divider p-4 rounded-xl">
          <span className="block text-2xl font-extrabold text-green-500">{completedCount}</span>
          <span className="text-xs text-secondary font-medium">Tasks Completed</span>
        </Card>
        <Card className="metric-card bg-card border border-divider p-4 rounded-xl">
          <span className="block text-2xl font-extrabold text-warning">{inProgressCount}</span>
          <span className="text-xs text-secondary font-medium">In Progress</span>
        </Card>
        <Card className="metric-card bg-card border border-divider p-4 rounded-xl">
          <span className="block text-2xl font-extrabold text-danger">{overdueCount}</span>
          <span className="text-xs text-secondary font-medium">Overdue Tasks</span>
        </Card>
      </div>

      <Card title="Task Velocity Analytics" subtitle="Line distribution of tasks across the development workflow status cycles.">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="analytics-chart-container flex-1 bg-surface p-4 border border-divider rounded-xl relative">
            <svg viewBox="0 0 320 120" className="w-full h-auto text-primary">
              <defs>
                <linearGradient id="gradient-accent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <g stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3">
                <line x1="40" y1="10" x2="40" y2="110" />
                <line x1="120" y1="10" x2="120" y2="110" />
                <line x1="200" y1="10" x2="200" y2="110" />
                <line x1="280" y1="10" x2="280" y2="110" />
                <line x1="10" y1="100" x2="310" y2="100" />
              </g>
              {fillPathStr && <path d={fillPathStr} fill="url(#gradient-accent)" />}
              {chartPathStr && (
                <path d={chartPathStr} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              )}
              {chartCoordinates.map((pt, index) => (
                <g key={index}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2" />
                  <text x={pt.x} y={pt.y - 8} fontSize="7" fontWeight="bold" textAnchor="middle" fill="var(--text-primary)">
                    {pt.count}
                  </text>
                </g>
              ))}
              <text x="40" y="115" fontSize="6" fontWeight="semibold" fill="var(--text-secondary)" textAnchor="middle">
                To Do
              </text>
              <text x="120" y="115" fontSize="6" fontWeight="semibold" fill="var(--text-secondary)" textAnchor="middle">
                In Progress
              </text>
              <text x="200" y="115" fontSize="6" fontWeight="semibold" fill="var(--text-secondary)" textAnchor="middle">
                In Review
              </text>
              <text x="280" y="115" fontSize="6" fontWeight="semibold" fill="var(--text-secondary)" textAnchor="middle">
                Done
              </text>
            </svg>
          </div>

          <div className="flex flex-col gap-3 min-w-[160px]">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span> To Do</span>
              <strong>{todoCount}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress</span>
              <strong>{inProgressCount}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> In Review</span>
              <strong>{inReviewCount}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Done</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
