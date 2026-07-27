import { useCallback, useMemo, useState } from 'react'
import {
  acceptTeamInvite,
  createTeam,
  deleteTeam,
  fetchMyTeams,
  inviteTeamMember,
  removeTeamMember,
  renameTeam,
  revokeTeamInvite,
} from '../api'
import type { Team, TeamMember, TeamRole, User, WorkspaceSelection } from '../types'

export function useTeams(
  _workspace: WorkspaceSelection,
  setWorkspace: (val: WorkspaceSelection) => void,
  user: User | null,
  canPerformAction: (
    role: TeamRole | undefined,
    action: 'rename' | 'delete' | 'invite' | 'revoke' | 'remove-member' | 'remove-admin' | 'remove-owner' | 'view' | 'create'
  ) => boolean
) {
  const [teams, setTeams] = useState<Team[]>([])

  // Memoized Team context helpers computed locally for hook operations
  const selectedTeam = useMemo(() => {
    if (_workspace.kind === 'team') {
      return teams.find((team) => team.id === _workspace.teamId) ?? null
    }
    return null
  }, [_workspace, teams])

  const currentRole = useMemo(() => {
    if (!user || !selectedTeam) return undefined
    return (
      (selectedTeam.members ?? []).find((member) => member.userId === user.id)?.role ??
      selectedTeam.myRole
    )
  }, [selectedTeam, user])
  const [teamForm, setTeamForm] = useState({ name: '', description: '', purpose: '' })
  const [teamNameEdit, setTeamNameEdit] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamMessage, setTeamMessage] = useState('')
  const [acceptToken, setAcceptToken] = useState('')
  const [pendingRevokeInviteId, setPendingRevokeInviteId] = useState<string | null>(null)
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState(false)
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null)

  const loadTeams = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    try {
      const data = await fetchMyTeams()
      setTeams(data.map((team) => ({ ...team, invites: team.invites ?? [] })))
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Unable to load teams')
    }
  }, [])

  const handleCreateTeamSubmit = async () => {
    if (!user) return
    const trimmed = teamForm.name.trim()
    if (!trimmed) {
      setTeamError('Please enter a team name.')
      return
    }
    try {
      const createdTeam = await createTeam(
        trimmed,
        teamForm.description.trim(),
        teamForm.purpose.trim()
      )
      setTeams((current) => [createdTeam, ...current])
      setWorkspace({ kind: 'team', teamId: createdTeam.id })
      setTeamForm({ name: '', description: '', purpose: '' })
      setTeamNameEdit(trimmed)
      setTeamMessage(`Team “${trimmed}” is ready for collaboration.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not create team')
    }
  }

  const handleRenameTeamSubmit = async (selectedTeam: Team) => {
    if (!canPerformAction(currentRole, 'rename')) {
      setTeamError('Only the team owner can rename this workspace.')
      return
    }
    const trimmed = teamNameEdit.trim()
    if (!trimmed) {
      setTeamError('Please provide a new team name.')
      return
    }
    try {
      const updated = await renameTeam(selectedTeam.id, trimmed)
      setTeams((current) =>
        current.map((team) =>
          team.id === selectedTeam.id
            ? {
                ...team,
                ...updated,
                members: updated.members ?? team.members ?? [],
                invites: updated.invites ?? team.invites ?? [],
              }
            : team
        )
      )
      setTeamNameEdit(trimmed)
      setTeamMessage('Team renamed successfully.')
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not rename team')
    }
  }

  const handleDeleteTeamAction = async (selectedTeam: Team) => {
    if (pendingDeleteTeam) return
    if (!canPerformAction(currentRole, 'delete')) {
      setTeamError('Only the owner can delete this team.')
      return
    }
    setPendingDeleteTeam(true)
    try {
      await deleteTeam(selectedTeam.id)
      setTeams((current) => current.filter((team) => team.id !== selectedTeam.id))
      setWorkspace({ kind: 'private' })
      setTeamNameEdit('')
      setTeamMessage(
        `Team “${selectedTeam.name}” was deleted and its todos reverted to private.`
      )
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not delete team')
    } finally {
      setPendingDeleteTeam(false)
    }
  }

  const handleInviteMemberAction = async (selectedTeam: Team) => {
    if (!canPerformAction(currentRole, 'invite')) {
      setTeamError('Only owners and admins can send invites.')
      return
    }
    const trimmed = inviteEmail.trim()
    if (!trimmed) {
      setTeamError('Please provide an email address.')
      return
    }
    try {
      const invite = await inviteTeamMember(selectedTeam.id, trimmed)
      setTeams((current) =>
        current.map((team) =>
          team.id === selectedTeam.id
            ? { ...team, invites: [invite, ...(team.invites ?? [])] }
            : team
        )
      )
      setInviteEmail('')
      setTeamMessage(`Invite sent to ${trimmed}.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not send invite')
    }
  }

  const handleRevokeInviteAction = async (selectedTeam: Team, inviteId: string) => {
    if (pendingRevokeInviteId === inviteId) return
    if (!canPerformAction(currentRole, 'revoke')) {
      setTeamError('Only owners and admins can revoke invites.')
      return
    }
    setPendingRevokeInviteId(inviteId)
    try {
      await revokeTeamInvite(selectedTeam.id, inviteId)
      setTeams((current) =>
        current.map((team) =>
          team.id === selectedTeam.id
            ? {
                ...team,
                invites: (team.invites ?? []).map((invite) =>
                  invite.id === inviteId ? { ...invite, status: 'REVOKED' } : invite
                ),
              }
            : team
        )
      )
      setTeamMessage('Invite revoked.')
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not revoke invite')
    } finally {
      setPendingRevokeInviteId(null)
    }
  }

  const handleRemoveMemberAction = async (selectedTeam: Team, member: TeamMember) => {
    if (!user || pendingRemoveMemberId === member.id) return
    if (!canPerformAction(currentRole, 'remove-member')) {
      setTeamError('You do not have permission to remove members.')
      return
    }
    if (member.userId === selectedTeam.ownerId) {
      setTeamError('The team owner cannot be removed.')
      return
    }
    if (member.role === 'ADMIN' && currentRole === 'ADMIN') {
      setTeamError('Admins cannot remove other admins.')
      return
    }
    setPendingRemoveMemberId(member.id)
    try {
      await removeTeamMember(selectedTeam.id, member.userId)
      setTeams((current) =>
        current.map((team) =>
          team.id === selectedTeam.id
            ? {
                ...team,
                members: (team.members ?? []).filter((entry) => entry.id !== member.id),
              }
            : team
        )
      )
      setTeamMessage(`${member.user?.name ?? member.userId} was removed from the team.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not remove member')
    } finally {
      setPendingRemoveMemberId(null)
    }
  }

  const handleAcceptInviteAction = async (token: string) => {
    if (!user) return
    try {
      const result = await acceptTeamInvite(token)
      await loadTeams()
      setWorkspace({ kind: 'team', teamId: result.teamMember.teamId })
      setAcceptToken('')
      setTeamMessage('Invite accepted. You can now work in this shared workspace.')
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not accept invite')
      throw error
    }
  }

  const handleInviteAgainAction = async (selectedTeam: Team, email: string) => {
    if (!canPerformAction(currentRole, 'invite')) {
      setTeamError('Only owners and admins can send invites.')
      return
    }
    try {
      const invite = await inviteTeamMember(selectedTeam.id, email)
      setTeams((current) =>
        current.map((team) => {
          if (team.id !== selectedTeam.id) return team
          const invites = team.invites ?? []
          const exists = invites.some((i) => i.id === invite.id || i.email === email)
          const updatedInvites = exists
            ? invites.map((i) => (i.email === email ? invite : i))
            : [invite, ...invites]
          return { ...team, invites: updatedInvites }
        })
      )
      setTeamMessage(`Re-sent invitation to ${email}.`)
      setTeamError('')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Could not re-invite member')
    }
  }

  return {
    teams,
    setTeams,
    teamForm,
    setTeamForm,
    teamNameEdit,
    setTeamNameEdit,
    inviteEmail,
    setInviteEmail,
    teamError,
    setTeamError,
    teamMessage,
    setTeamMessage,
    acceptToken,
    setAcceptToken,
    pendingRevokeInviteId,
    pendingDeleteTeam,
    pendingRemoveMemberId,
    loadTeams,
    handleCreateTeam: handleCreateTeamSubmit,
    handleRenameTeam: handleRenameTeamSubmit,
    handleDeleteTeam: handleDeleteTeamAction,
    handleInviteMember: handleInviteMemberAction,
    handleInviteAgain: handleInviteAgainAction,
    handleRevokeInvite: handleRevokeInviteAction,
    handleRemoveMember: handleRemoveMemberAction,
    handleAcceptInvite: handleAcceptInviteAction,
  }
}
