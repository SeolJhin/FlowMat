import { Suspense, lazy } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import {
  preloadInventoryRoute,
  preloadRulesRoute,
  preloadRunDetailRoute,
  preloadRunsRoute,
  preloadTemplatesRoute,
} from './routePreload'
import { preloadWorkspaceRoute } from '../../pages/workspace/ui/workspacePreload'
import { AuthGuard } from './AuthGuard'
import { AdminGuard } from './AdminGuard'

const HomeRoute = lazy(() =>
  import('../../pages/home/ui/HomeRoute').then((m) => ({ default: m.HomeRoute }))
)
const InviteAcceptRoute = lazy(() =>
  import('../../pages/invite/ui/InviteAcceptRoute').then((m) => ({ default: m.InviteAcceptRoute }))
)
const OAuthCallbackRoute = lazy(() =>
  import('../../pages/oauth/ui/OAuthCallbackRoute').then((m) => ({ default: m.OAuthCallbackRoute }))
)
const DormantReactivationRoute = lazy(() =>
  import('../../pages/dormant/ui/DormantReactivationRoute').then((m) => ({ default: m.DormantReactivationRoute }))
)
const AdminRoute = lazy(() =>
  import('../../pages/admin/ui/AdminRoute').then((m) => ({ default: m.AdminRoute }))
)
const EditorDemoRoute = lazy(() =>
  import('../../pages/editor-demo/ui/EditorDemoRoute').then((m) => ({ default: m.EditorDemoRoute }))
)
const ProjectSettingsRoute = lazy(() =>
  import('../../pages/project-settings/ui/ProjectSettingsRoute').then((m) => ({ default: m.ProjectSettingsRoute }))
)
const WorkspaceRoute = lazy(() =>
  preloadWorkspaceRoute().then((m) => ({ default: m.WorkspaceRoute }))
)
const InventoryRoute = lazy(() =>
  preloadInventoryRoute().then((m) => ({ default: m.InventoryRoute }))
)
const RunsRoute = lazy(() =>
  preloadRunsRoute().then((m) => ({ default: m.RunsRoute }))
)
const RunDetailRoute = lazy(() =>
  preloadRunDetailRoute().then((m) => ({ default: m.RunDetailRoute }))
)
const TemplatesRoute = lazy(() =>
  preloadTemplatesRoute().then((m) => ({ default: m.TemplatesRoute }))
)
const RulesRoute = lazy(() =>
  preloadRulesRoute().then((m) => ({ default: m.RulesRoute }))
)

function RouteFallback() {
  return <div className="workspace-loading">Loading...</div>
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  // Public routes
  { path: '/', element: withSuspense(<HomeRoute />) },
  { path: '/invite/accept', element: withSuspense(<InviteAcceptRoute />) },
  { path: '/oauth2/success', element: withSuspense(<OAuthCallbackRoute />) },
  { path: '/reactivate-account', element: withSuspense(<DormantReactivationRoute />) },
  { path: '/editor-demo', element: withSuspense(<EditorDemoRoute />) },

  // Protected routes — AuthGuard redirects to / if no token
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AdminGuard />,
        children: [
          { path: '/admin', element: withSuspense(<AdminRoute />) },
        ],
      },
      { path: '/projects/:projectId/settings', element: withSuspense(<ProjectSettingsRoute />) },
      { path: '/projects/:projectId/workflows/:workflowId', element: withSuspense(<WorkspaceRoute />) },
      { path: '/projects/:projectId/inventory', element: withSuspense(<InventoryRoute />) },
      { path: '/projects/:projectId/runs', element: withSuspense(<RunsRoute />) },
      { path: '/projects/:projectId/runs/:runId', element: withSuspense(<RunDetailRoute />) },
      { path: '/projects/:projectId/templates', element: withSuspense(<TemplatesRoute />) },
      { path: '/projects/:projectId/rules', element: withSuspense(<RulesRoute />) },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
