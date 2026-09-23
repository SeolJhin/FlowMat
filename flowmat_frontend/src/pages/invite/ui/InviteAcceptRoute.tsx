import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcceptInviteMutation } from '../../../entities/project/api/useAcceptInviteMutation'
import { useInvitePreviewQuery } from '../../../entities/project/api/useInvitePreviewQuery'
import { tokenStorage } from '../../../entities/auth/api/useLoginMutation'
import { errorMessage as toErrorMessage } from '../../../shared/lib/errorMessage'
import { inviteBlockedReason } from '../model/inviteBlockedReason'

type Phase = 'idle' | 'accepting' | 'success' | 'error' | 'no-token' | 'not-logged-in'

export function InviteAcceptRoute() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const acceptMutation = useAcceptInviteMutation()
  const previewQuery = useInvitePreviewQuery(token, phase === 'idle' || phase === 'accepting')
  const preview = previewQuery.data

  useEffect(() => {
    if (!token) {
      setPhase('no-token')
      return
    }
    if (!tokenStorage.getAccess()) {
      setPhase('not-logged-in')
      return
    }
    setPhase('idle')
  }, [token])

  async function handleAccept() {
    if (!token) return
    setPhase('accepting')
    try {
      await acceptMutation.mutateAsync(token)
      setPhase('success')
    } catch (err) {
      // Failures arrive as UiError objects, not Error instances.
      setErrorMessage(toErrorMessage(err, 'Failed to accept invitation.'))
      setPhase('error')
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const cardStyle: React.CSSProperties = {
    width: 360,
    padding: 32,
    border: '1px solid var(--border)',
    borderRadius: 16,
    display: 'grid',
    gap: 16,
    background: 'var(--bg)',
    textAlign: 'center',
  }

  if (phase === 'no-token') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2>Invalid Link</h2>
          <p style={{ color: 'var(--text)', opacity: 0.7 }}>This invitation link is missing a token.</p>
          <Link to="/" style={{ color: 'var(--accent)' }}>Go to home</Link>
        </div>
      </div>
    )
  }

  if (phase === 'not-logged-in') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2>Sign in to accept</h2>
          <p style={{ color: 'var(--text)', opacity: 0.7 }}>
            You need to be signed in to accept this invitation. After logging in, come back to this link.
          </p>
          <Link to="/" style={{ color: 'var(--accent)' }}>Go to login</Link>
        </div>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2>Invitation accepted</h2>
          <p style={{ color: 'var(--text)', opacity: 0.7 }}>You have joined the project successfully.</p>
          <Link to="/" style={{ color: 'var(--accent)' }}>Go to home</Link>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2>Could not accept</h2>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{errorMessage}</p>
          <Link to="/" style={{ color: 'var(--accent)' }}>Go to home</Link>
        </div>
      </div>
    )
  }

  const blockedReason = inviteBlockedReason(preview)
  const canAccept = Boolean(preview) && !blockedReason && phase !== 'accepting'

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2>Project Invitation</h2>
        {previewQuery.isLoading && <p style={{ opacity: 0.7 }}>Loading invitation…</p>}
        {previewQuery.isError && (
          <p style={{ color: '#dc2626', fontSize: 14 }}>
            {toErrorMessage(previewQuery.error, 'This invitation could not be found.')}
          </p>
        )}
        {preview && (
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', textAlign: 'left', margin: 0, fontSize: 14 }}>
            <dt style={{ opacity: 0.6 }}>Project</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{preview.projectName}</dd>
            <dt style={{ opacity: 0.6 }}>Role</dt>
            <dd style={{ margin: 0 }}>{preview.projectRole}</dd>
            <dt style={{ opacity: 0.6 }}>Invited by</dt>
            <dd style={{ margin: 0 }}>{preview.inviterName ?? 'Unknown'}</dd>
            {preview.expiredAt && (
              <>
                <dt style={{ opacity: 0.6 }}>Expires</dt>
                <dd style={{ margin: 0 }}>{new Date(preview.expiredAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
        )}
        {blockedReason && <p style={{ color: '#b45309', fontSize: 13, margin: 0 }}>{blockedReason}</p>}
        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={!canAccept}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: canAccept ? 'pointer' : 'not-allowed', opacity: canAccept ? 1 : 0.5, fontSize: 15 }}
        >
          {phase === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
        </button>
        <Link to="/" style={{ fontSize: 13, color: 'var(--text)', opacity: 0.6 }}>Cancel</Link>
      </div>
    </div>
  )
}
