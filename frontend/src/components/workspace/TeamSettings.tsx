import { type FormEvent } from 'react'
import type { Team, TeamRole } from '../../types'
import { Card } from '../shared/Card'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'

interface TeamSettingsProps {
  selectedTeam: Team
  currentRole: TeamRole | undefined
  teamNameEdit: string
  onChangeTeamNameEdit: (val: string) => void
  onRenameTeam: (event: FormEvent<HTMLFormElement>) => void
  onDeleteTeam: () => void
  isDeletingTeam: boolean
  canPerformAction: (role: TeamRole | undefined, action: any) => boolean
}

export function TeamSettings({
  selectedTeam: _selectedTeam,
  currentRole,
  teamNameEdit,
  onChangeTeamNameEdit,
  onRenameTeam,
  onDeleteTeam,
  isDeletingTeam,
  canPerformAction,
}: TeamSettingsProps) {
  const canRename = canPerformAction(currentRole, 'rename')
  const canDelete = canPerformAction(currentRole, 'delete')

  return (
    <div className="workspace-settings-tab animated-fade-in">
      <Card title="Workspace Settings" subtitle={`Configure and manage workspace details for ${_selectedTeam?.name || 'this team'}.`}>
        {!canRename && (
          <div className="p-3 bg-surface border border-divider rounded-xl mb-4 text-xs text-secondary flex items-center gap-2">
            <span>ℹ️</span>
            <span>You are currently a <strong>Member</strong> of <strong>{_selectedTeam?.name}</strong>. Management actions like renaming or deleting the workspace require <strong>Owner</strong> privileges.</span>
          </div>
        )}
        <form className="team-form" onSubmit={onRenameTeam}>
          <Input
            id="teamRename"
            label="Rename Workspace Team"
            value={teamNameEdit}
            onChange={(e) => onChangeTeamNameEdit(e.target.value)}
            disabled={!canRename}
            placeholder="e.g. Operations Team"
          />
          <Button type="submit" disabled={!canRename} className="mt-2 w-max">
            Rename Team
          </Button>
        </form>

        <div className="danger-zone-section mt-8 pt-6 border-t border-divider">
          <h3 className="text-danger font-bold text-sm mb-2">⚠️ Danger Zone</h3>
          <p className="text-xs text-secondary mb-4">
            Deleting this workspace team will permanently remove all tasks, discussion chat messages, files, and members.
            This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="danger"
            disabled={isDeletingTeam || !canDelete}
            onClick={onDeleteTeam}
            className="w-max"
          >
            {isDeletingTeam ? 'Deleting Workspace…' : 'Delete Team Workspace'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
