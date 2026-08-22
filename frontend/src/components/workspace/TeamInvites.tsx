import { type FormEvent } from 'react'
import type { Team, TeamRole } from '../../types'
import { Card } from '../shared/Card'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'

interface TeamInvitesProps {
  selectedTeam: Team
  currentRole: TeamRole | undefined
  inviteEmail: string
  onChangeInviteEmail: (val: string) => void
  onInviteMember: (event: FormEvent<HTMLFormElement>) => void
  onRevokeInvite: (id: string) => void
  isRevokingInviteId: string | null
  onInviteAgain?: (email: string) => void
  canPerformAction: (role: TeamRole | undefined, action: any) => boolean
}

export function TeamInvites({
  selectedTeam,
  currentRole,
  inviteEmail,
  onChangeInviteEmail,
  onInviteMember,
  onRevokeInvite,
  isRevokingInviteId,
  onInviteAgain,
  canPerformAction,
}: TeamInvitesProps) {
  const displayInvites = (selectedTeam.invites ?? []).filter(
    (invite) => invite.status !== 'ACCEPTED'
  )

  const canInvite = canPerformAction(currentRole, 'invite')

  return (
    <div className="workspace-invites-tab animated-fade-in flex flex-col gap-6">
      <Card title="Invite Members" subtitle="Send an email invitation to invite colleagues to join this team workspace.">
        <form className="team-form mt-4" onSubmit={onInviteMember}>
          <Input
            id="inviteEmail"
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => onChangeInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            disabled={!canInvite}
          />
          <Button type="submit" disabled={!canInvite} className="mt-2 w-max">
            Send Invitation
          </Button>
        </form>
      </Card>

      <Card title="Pending Invitations" subtitle="List of pending/expired invites.">
        {displayInvites.length === 0 ? (
          <p className="text-sm text-secondary py-2">No pending invitations.</p>
        ) : (
          <ul className="member-list flex flex-col gap-3 mt-4">
            {displayInvites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between p-3 border border-divider rounded-xl bg-card">
                <div>
                  <strong className="text-sm font-semibold text-foreground">{invite.email}</strong>
                  <span className={`block text-xs font-semibold mt-1 ${invite.status === 'REJECTED' ? 'text-danger' : 'text-warning'}`}>
                    {invite.status}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {invite.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRevokingInviteId === invite.id || !canPerformAction(currentRole, 'revoke')}
                      onClick={() => onRevokeInvite(invite.id)}
                      className="text-danger hover:bg-danger-light"
                    >
                      {isRevokingInviteId === invite.id ? 'Canceling…' : 'Cancel Invitation'}
                    </Button>
                  )}
                  {invite.status === 'REJECTED' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRevokingInviteId === invite.id || !canPerformAction(currentRole, 'revoke')}
                        onClick={() => onRevokeInvite(invite.id)}
                        className="text-danger hover:bg-danger-light"
                      >
                        {isRevokingInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                      </Button>
                      {onInviteAgain && (
                        <Button
                          size="sm"
                          disabled={!canInvite}
                          onClick={() => onInviteAgain(invite.email)}
                        >
                          Invite Again
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
