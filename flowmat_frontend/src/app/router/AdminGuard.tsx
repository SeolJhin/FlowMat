import { Navigate, Outlet } from 'react-router-dom'
import { useMyPermissionsQuery } from '../../entities/auth/api/useMyPermissionsQuery'

export function AdminGuard() {
  const { data, isLoading, isError } = useMyPermissionsQuery(true)

  if (isLoading) {
    return <div className="workspace-loading">Checking admin access...</div>
  }

  if (isError || !data?.canManageUsers) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
