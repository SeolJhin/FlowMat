import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useReactivateDormantMutation } from '../../../entities/auth/api/useLoginMutation'

type Phase = 'processing' | 'success' | 'error'

export function DormantReactivationRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [phase, setPhase] = useState<Phase>('processing')
  const [message, setMessage] = useState('Reactivating your account...')
  const reactivateMutation = useReactivateDormantMutation()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setPhase('error')
      setMessage('Reactivation token is missing.')
      return
    }

    let cancelled = false

    void reactivateMutation.mutateAsync(token)
      .then(() => {
        if (cancelled) return
        setPhase('success')
        setMessage('Your account has been reactivated. Redirecting to login...')
        window.setTimeout(() => {
          if (!cancelled) {
            navigate('/', { replace: true })
          }
        }, 1800)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPhase('error')
        setMessage(error instanceof Error ? error.message : 'Failed to reactivate the account.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate, reactivateMutation, token])

  const shellStyle: React.CSSProperties = {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  }

  const cardStyle: React.CSSProperties = {
    width: 420,
    maxWidth: '100%',
    padding: 28,
    border: '1px solid var(--border)',
    borderRadius: 16,
    display: 'grid',
    gap: 14,
    background: 'var(--bg)',
  }

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: 0 }}>Dormant Account</h2>
        <p style={{ margin: 0, color: phase === 'error' ? '#dc2626' : 'inherit' }}>{message}</p>
        {phase !== 'processing' && (
          <Link to="/" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Back to home
          </Link>
        )}
      </div>
    </div>
  )
}
