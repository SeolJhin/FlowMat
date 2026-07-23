import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { refreshAccessToken, tokenStorage } from '../../entities/auth/lib/authSession'

/**
 * Layout route that redirects unauthenticated users to the home (login) page.
 * Protected pages are rendered via <Outlet />.
 */
export function AuthGuard() {
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>(() => {
    if (tokenStorage.getAccess()) return 'authorized'
    if (tokenStorage.hasRefreshSessionHint()) return 'checking'
    return 'unauthorized'
  })

  useEffect(() => {
    if (status !== 'checking') return

    let cancelled = false

    void refreshAccessToken().then((ok) => {
      if (!cancelled) {
        setStatus(ok ? 'authorized' : 'unauthorized')
      }
    })

    return () => {
      cancelled = true
    }
  }, [status])

  if (status === 'checking') {
    return <div className="workspace-loading">Restoring session...</div>
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
