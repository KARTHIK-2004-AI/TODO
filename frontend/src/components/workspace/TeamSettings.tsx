import { type FormEvent, useState } from 'react'
import type { Team, TeamRole } from '../../types'
import { Card } from '../shared/Card'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { Modal } from '../shared/Modal'

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const expectedName = _selectedTeam?.name ?? ''
  const isConfirmMatch = confirmText.trim() === expectedName

  const handleConfirmDelete = () => {
    if (!isConfirmMatch) return
    onDeleteTeam()
    setIsConfirmOpen(false)
    setConfirmText('')
  }

  const closeModal = () => {
    setIsConfirmOpen(false)
    setConfirmText('')
  }

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
            onClick={() => setIsConfirmOpen(true)}
            className="w-max"
          >
            {isDeletingTeam ? 'Deleting Workspace…' : 'Delete Team Workspace'}
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isConfirmOpen}
        onClose={closeModal}
        title="Delete Team Workspace"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!isConfirmMatch || isDeletingTeam}
              onClick={handleConfirmDelete}
            >
              {isDeletingTeam ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </>
        }
      >
        <p className="text-xs text-secondary mb-3">
          This will permanently delete <strong>{expectedName}</strong> along with all of its tasks,
          discussion messages, files, and member records. This action cannot be undone.
        </p>
        <Input
          id="confirmTeamName"
          label={`Type "${expectedName}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={expectedName}
          autoFocus
        />
      </Modal>
    </div>
  )
}
