import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcceptInviteMutation } from '../../../entities/project/api/useAcceptInviteMutation'
import { tokenStorage } from '../../../entities/auth/api/useLoginMutation'

type Phase = 'idle' | 'accepting' | 'success' | 'error' | 'no-token' | 'not-logged-in'

export function InviteAcceptRoute() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const acceptMutation = useAcceptInviteMutation()

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
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation.')
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

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2>Project Invitation</h2>
        <p style={{ color: 'var(--text)', opacity: 0.7 }}>
          You have been invited to join a FlowMat project. Click below to accept.
        </p>
        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={phase === 'accepting'}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15 }}
        >
          {phase === 'accepting' ? 'Accepting…' : 'Accept Invitation'}
        </button>
        <Link to="/" style={{ fontSize: 13, color: 'var(--text)', opacity: 0.6 }}>Cancel</Link>
      </div>
    </div>
  )
}
