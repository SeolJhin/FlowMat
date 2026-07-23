import { Navigate, Outlet } from 'react-router-dom'
import { tokenStorage } from '../../entities/auth/api/useLoginMutation'

/**
 * Layout route that redirects unauthenticated users to the home (login) page.
 * Protected pages are rendered via <Outlet />.
 */
export function AuthGuard() {
  if (!tokenStorage.getAccess()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
