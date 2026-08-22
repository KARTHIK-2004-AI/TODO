import { useMemo } from 'react'
import type { Team, TeamMember, TeamRole, User, Todo } from '../../types'
import { Card } from '../shared/Card'
import { Avatar } from '../shared/Avatar'
import { Button } from '../shared/Button'

interface TeamMembersProps {
  selectedTeam: Team
  currentRole: TeamRole | undefined
  user: User
  onRemoveMember: (member: TeamMember) => void
  isRemovingMemberId: string | null
  onUpdateMemberRole?: (userId: string, role: TeamRole) => void
  canPerformAction: (role: TeamRole | undefined, action: any) => boolean
  getRoleLabel: (role: TeamRole) => string
  todos: Todo[]
}

export function TeamMembers({
  selectedTeam,
  currentRole,
  user,
  onRemoveMember,
  isRemovingMemberId,
  onUpdateMemberRole,
  canPerformAction,
  getRoleLabel,
  todos,
}: TeamMembersProps) {
  
  const memberStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {}
    todos.forEach((todo) => {
      if (todo.assignedToUserId) {
        if (!stats[todo.assignedToUserId]) {
          stats[todo.assignedToUserId] = { total: 0, completed: 0 }
        }
        stats[todo.assignedToUserId].total++
        if (todo.completed || todo.status === 'DONE') {
          stats[todo.assignedToUserId].completed++
        }
      }
    })
    return stats
  }, [todos])

  return (
    <div className="workspace-members-tab animated-fade-in">
      <Card title="Workspace Members" subtitle="Roster of team members in this shared workspace.">
        <ul className="member-list flex flex-col gap-4 mt-4">
          {(selectedTeam.members ?? []).map((member) => {
            const stats = memberStats[member.userId] || { total: 0, completed: 0 }
            const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
            const isMe = member.userId === user.id
            const canManage = canPerformAction(currentRole, 'invite') && !isMe && member.role !== 'OWNER'

            return (
              <li key={member.id} className="flex items-center justify-between p-3 border border-divider rounded-xl bg-card hover:bg-hover transition-all">
                <div className="flex items-center gap-3">
                  <Avatar src={member.user?.avatarUrl} name={member.user?.name ?? member.userId} isOnline={member.user?.isOnline} size={38} />
                  <div>
                    <strong className="text-sm font-bold text-foreground">
                      {member.user?.name ?? member.userId} {isMe ? ' (You)' : ''}
                    </strong>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {member.user?.isOnline ? (
                          <span className="text-success font-semibold">Online</span>
                        ) : member.user?.lastSeen ? (
                          `Offline (last seen ${new Date(member.user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                        ) : (
                          'Offline'
                        )}
                      </span>
                    </div>

                    <span className="text-[11px] text-secondary mt-0.5 block">
                      Assigned: <strong>{stats.total}</strong> tasks · <strong>{completionRate}%</strong> completed
                    </span>
                    
                    {canManage ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-secondary">Role:</span>
                        <select
                          value={member.role}
                          onChange={(e) => onUpdateMemberRole?.(member.userId, e.target.value as TeamRole)}
                          className="text-[11px] p-0.5 px-1 border border-divider rounded bg-surface text-foreground focus:outline-none"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary mt-1.5 block font-medium">
                        Role: {getRoleLabel(member.role)}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    isRemovingMemberId === member.id ||
                    !canPerformAction(currentRole, member.role === 'ADMIN' ? 'remove-admin' : 'remove-member') ||
                    isMe
                  }
                  onClick={() => onRemoveMember(member)}
                  className="text-danger hover:bg-danger-light"
                >
                  {isRemovingMemberId === member.id ? 'Removing…' : 'Remove'}
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
