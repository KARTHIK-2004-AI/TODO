/**
 * Shared task formatting utilities.
 * Extracted from TodoItem.tsx and TaskCard.tsx (were identical in both files).
 */

import type { TaskPriority } from '../types'

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export function getPriorityVariant(priority: string): BadgeVariant {
  switch (priority) {
    case 'LOW':
      return 'neutral'
    case 'MEDIUM':
      return 'secondary'
    case 'HIGH':
      return 'warning'
    case 'URGENT':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function getPriorityColorClass(priority: TaskPriority): string {
  switch (priority) {
    case 'URGENT':
      return 'priority-urgent'
    case 'HIGH':
      return 'priority-high'
    case 'MEDIUM':
      return 'priority-medium'
    case 'LOW':
      return 'priority-low'
    default:
      return 'priority-medium'
  }
}

export function formatFriendlyDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Overdue (Yesterday)'
  if (diffDays < -1) return `Overdue (${Math.abs(diffDays)} days ago)`
  if (diffDays > 1 && diffDays <= 3) return `${diffDays} days left`
  return d.toLocaleDateString()
}

export function getActivityIcon(action: string): string {
  switch (action) {
    case 'TODO_CREATE':   return '📝'
    case 'TODO_COMPLETE': return '✅'
    case 'TODO_UPDATE':   return '✏️'
    case 'TODO_DELETE':   return '🗑️'
    case 'TEAM_CREATE':   return '👥'
    case 'TEAM_RENAME':   return '🏷️'
    case 'TEAM_DELETE':   return '❌'
    case 'TEAM_INVITE':   return '✉️'
    case 'TEAM_ACCEPT_INVITE': return '👋'
    case 'TEAM_REMOVE_MEMBER': return '🚪'
    case 'TEAM_CHANGE_ROLE':   return '🛡️'
    default: return '🔔'
  }
}

export function getActivityText(log: { action: string; user?: { name?: string }; metadata: any }): string {
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
      return `${userName} updated workspace`
  }
}
