import { type FormEvent } from 'react'
import type { Team, TeamMember, TeamRole, User } from '../types'
import { Avatar } from './Avatar'

interface TeamCardProps {
  selectedTeam: Team
  currentRole: TeamRole | undefined
  user: User
  teamNameEdit: string
  onChangeTeamNameEdit: (val: string) => void
  onRenameTeam: (event: FormEvent<HTMLFormElement>) => void
  onDeleteTeam: () => void
  isDeletingTeam: boolean
  inviteEmail: string
  onChangeInviteEmail: (val: string) => void
  onInviteMember: (event: FormEvent<HTMLFormElement>) => void
  onRevokeInvite: (id: string) => void
  isRevokingInviteId: string | null
  onRemoveMember: (member: TeamMember) => void
  isRemovingMemberId: string | null
  canPerformAction: (
    role: TeamRole | undefined,
    action:
      | 'rename'
      | 'delete'
      | 'invite'
      | 'revoke'
      | 'remove-member'
      | 'remove-admin'
      | 'remove-owner'
      | 'view'
      | 'create'
  ) => boolean
  getRoleLabel: (role: TeamRole) => string
  teamError?: string
  teamMessage?: string
  onInviteAgain?: (email: string) => void
}

export function TeamCard({
  selectedTeam,
  currentRole,
  user,
  teamNameEdit,
  onChangeTeamNameEdit,
  onRenameTeam,
  onDeleteTeam,
  isDeletingTeam,
  inviteEmail,
  onChangeInviteEmail,
  onInviteMember,
  onRevokeInvite,
  isRevokingInviteId,
  onRemoveMember,
  isRemovingMemberId,
  canPerformAction,
  getRoleLabel,
  teamError,
  teamMessage,
  onInviteAgain,
}: TeamCardProps) {
  const displayInvites = (selectedTeam.invites ?? []).filter(
    (invite) => invite.status !== 'ACCEPTED'
  )
  return (
    <section className="panel" aria-label="team settings">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Team management</p>
          <h2>{selectedTeam.name}</h2>
        </div>
        <div className="pill">
          Role: {currentRole ? getRoleLabel(currentRole) : 'Member'}
        </div>
      </div>
      {teamError ? (
        <p className="error-text" style={{ padding: '0 24px', margin: '12px 0 0 0' }}>
          {teamError}
        </p>
      ) : null}
      {teamMessage ? (
        <p className="status-text" style={{ padding: '0 24px', margin: '12px 0 0 0' }}>
          {teamMessage}
        </p>
      ) : null}
      <div className="team-grid">
        <div className="team-card">
          <h3>Settings</h3>
          <form className="team-form" onSubmit={onRenameTeam}>
            <div className="field-group">
              <label htmlFor="teamRename">Rename team</label>
              <input
                id="teamRename"
                value={teamNameEdit}
                onChange={(event) => onChangeTeamNameEdit(event.target.value)}
                disabled={!canPerformAction(currentRole, 'rename')}
              />
            </div>
            <button type="submit" disabled={!canPerformAction(currentRole, 'rename')}>
              Rename team
            </button>
          </form>
          <button
            type="button"
            className="delete"
            disabled={isDeletingTeam || !canPerformAction(currentRole, 'delete')}
            onClick={onDeleteTeam}
          >
            {isDeletingTeam ? 'Deleting…' : 'Delete team'}
          </button>
        </div>

        <div className="team-card">
          <h3>Members</h3>
          <ul className="member-list">
            {(selectedTeam.members ?? []).map((member) => (
              <li key={member.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar
                    src={member.user?.avatarUrl}
                    name={member.user?.name ?? member.userId}
                    size={36}
                  />
                  <div>
                    <strong>{member.user?.name ?? member.userId}</strong>
                    <p>{getRoleLabel(member.role)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    isRemovingMemberId === member.id ||
                    !canPerformAction(
                      currentRole,
                      member.role === 'ADMIN' ? 'remove-admin' : 'remove-member'
                    ) ||
                    member.userId === user.id
                  }
                  onClick={() => onRemoveMember(member)}
                >
                  {isRemovingMemberId === member.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="team-card">
          <h3>Invites</h3>
          <form className="team-form" onSubmit={onInviteMember}>
            <div className="field-group">
              <label htmlFor="inviteEmail">Invite member</label>
              <input
                id="inviteEmail"
                value={inviteEmail}
                onChange={(event) => onChangeInviteEmail(event.target.value)}
                placeholder="colleague@example.com"
                disabled={!canPerformAction(currentRole, 'invite')}
              />
            </div>
            <button type="submit" disabled={!canPerformAction(currentRole, 'invite')}>
              Send invite
            </button>
          </form>
          <ul className="member-list">
            {displayInvites.map((invite) => (
              <li key={invite.id}>
                <div>
                  <strong>{invite.email}</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: invite.status === 'REJECTED' ? '#ef4444' : '#666' }}>
                    {invite.status}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {invite.status === 'PENDING' && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={
                        isRevokingInviteId === invite.id ||
                        !canPerformAction(currentRole, 'revoke')
                      }
                      onClick={() => onRevokeInvite(invite.id)}
                    >
                      {isRevokingInviteId === invite.id ? 'Canceling…' : 'Cancel invitation'}
                    </button>
                  )}
                  {invite.status === 'REJECTED' && (
                    <>
                      <button
                        type="button"
                        className="secondary"
                        disabled={
                          isRevokingInviteId === invite.id ||
                          !canPerformAction(currentRole, 'revoke')
                        }
                        onClick={() => onRevokeInvite(invite.id)}
                      >
                        {isRevokingInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                      </button>
                      {onInviteAgain && (
                        <button
                          type="button"
                          className="secondary"
                          disabled={!canPerformAction(currentRole, 'invite')}
                          onClick={() => onInviteAgain(invite.email)}
                        >
                          Invite again
                        </button>
                      )}
                    </>
                  )}
                  {(invite.status === 'REVOKED' || invite.status === 'EXPIRED') && (
                    <span style={{ fontSize: '0.8rem', color: '#999', alignSelf: 'center' }}>History only</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
