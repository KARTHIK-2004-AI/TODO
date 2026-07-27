import { useEffect, useState } from 'react'
import { fetchInviteDetails, rejectTeamInvite, type InviteDetails } from '../api'

interface AcceptInviteProps {
  acceptToken: string
  setAcceptToken: (val: string) => void
  onAcceptInvite: (token: string) => Promise<void>
  teamError: string
  setTeamError: (val: string) => void
  teamMessage: string
  setTeamMessage: (val: string) => void
  onSuccess: () => void
}

export function AcceptInvite({
  acceptToken,
  setAcceptToken,
  onAcceptInvite,
  teamError,
  setTeamError,
  teamMessage,
  setTeamMessage,
  onSuccess,
}: AcceptInviteProps) {
  const [submitting, setSubmitting] = useState(false)
  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    const token = acceptToken.trim()
    if (token) {
      const loadDetails = async () => {
        setLoadingDetails(true)
        setDetailsError('')
        try {
          const res = await fetchInviteDetails(token)
          setDetails(res)
        } catch (err) {
          setDetailsError(err instanceof Error ? err.message : 'Invalid or expired invitation token')
          setDetails(null)
        } finally {
          setLoadingDetails(false)
        }
      }
      void loadDetails()
    } else {
      setDetails(null)
      setDetailsError('')
    }
  }, [acceptToken])

  const handleAccept = async () => {
    const token = acceptToken.trim()
    if (!token) return

    setSubmitting(true)
    setTeamError('')
    setTeamMessage('')
    try {
      await onAcceptInvite(token)
      setTeamMessage('Successfully joined the team!')
      onSuccess()
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Could not join the team')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    const token = acceptToken.trim()
    if (!token) return

    setSubmitting(true)
    setTeamError('')
    setTeamMessage('')
    try {
      await rejectTeamInvite(token)
      setTeamMessage('Invitation declined successfully.')
      onSuccess() // Redirect to dashboard
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Could not decline invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel invite-panel" style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Team Collaboration</p>
          <h2>Join Shared Workspace</h2>
        </div>
      </div>

      {!details && !loadingDetails ? (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="invite-copy" style={{ marginBottom: '1.5rem' }}>
            Enter an invitation token below to view the team details and decide whether to join.
          </p>
          <div className="field-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="inviteToken">Invitation Token</label>
            <input
              id="inviteToken"
              value={acceptToken}
              onChange={(event) => setAcceptToken(event.target.value)}
              placeholder="e.g. abc123xyz"
            />
          </div>
          {detailsError ? (
            <p className="error-text" style={{ marginBottom: '1.5rem' }}>{detailsError}</p>
          ) : null}
        </div>
      ) : null}

      {loadingDetails ? (
        <p className="status-text" style={{ padding: '2rem 0', textAlign: 'center' }}>
          Fetching invitation details…
        </p>
      ) : null}

      {details && !loadingDetails ? (
        <div style={{ marginTop: '1.5rem' }} className="invite-details-card">
          <div className="invite-team-info" style={{ borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#111', margin: '0 0 0.5rem 0' }}>{details.teamName}</h3>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
              Invited by <strong>{details.invitedBy}</strong> (Owner: <strong>{details.ownerName}</strong>)
            </p>
            <p style={{ margin: '0.5rem 0 0 0', color: '#888', fontSize: '0.8rem' }}>
              Invitation sent on: {new Date(details.invitationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', margin: '0 0 0.5rem 0' }}>
              Purpose of Team
            </h4>
            <p style={{ margin: '0', fontSize: '0.95rem', color: '#333', lineHeight: '1.5', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
              {details.purpose || 'No purpose specified.'}
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', margin: '0 0 0.5rem 0' }}>
              Description
            </h4>
            <p style={{ margin: '0', fontSize: '0.95rem', color: '#333', lineHeight: '1.5', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
              {details.description || 'No description provided.'}
            </p>
          </div>

          <div className="stats-row" style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Active Tasks</span>
              <strong style={{ fontSize: '1.5rem', color: '#111' }}>{details.tasksCount}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Team Members</span>
              <strong style={{ fontSize: '1.5rem', color: '#111' }}>{details.members.length}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', margin: '0 0 0.75rem 0' }}>
              Team Members
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {details.members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '999px', fontSize: '0.85rem', color: '#475569' }}>
                  <span>{m.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {details.recentActivity.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', margin: '0 0 0.75rem 0' }}>
                Recent Activity
              </h4>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                {details.recentActivity.map((act) => (
                  <li key={act.id} style={{ fontSize: '0.85rem', color: '#475569', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#0f172a', fontWeight: '500' }}>{act.userName}</span>{' '}
                    performed <code style={{ fontSize: '0.8rem', color: '#3b82f6' }}>{act.action}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {details.status !== 'PENDING' ? (
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '6px', color: '#92400e', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              This invitation is already <strong>{details.status}</strong> and cannot be acted upon.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              disabled={submitting || details.status !== 'PENDING'}
              onClick={handleAccept}
              style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
            >
              {submitting ? 'Accepting…' : 'Accept Invitation'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={submitting || details.status !== 'PENDING'}
              onClick={handleReject}
              style={{ flex: 1, padding: '12px', fontSize: '0.95rem', borderColor: '#ef4444', color: '#ef4444' }}
            >
              Decline Invitation
            </button>
          </div>
        </div>
      ) : null}

      {teamError ? <p className="error-text" style={{ marginTop: '1.5rem' }}>{teamError}</p> : null}
      {teamMessage ? <p className="status-text" style={{ marginTop: '1.5rem' }}>{teamMessage}</p> : null}

      {details && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setAcceptToken('')
            setDetails(null)
          }}
          style={{ width: '100%', marginTop: '1rem', padding: '10px' }}
        >
          Back
        </button>
      )}
    </section>
  )
}
export default AcceptInvite
