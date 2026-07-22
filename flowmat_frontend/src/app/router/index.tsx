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

const HomeRoute = lazy(() =>
  import('../../pages/home/ui/HomeRoute').then((module) => ({ default: module.HomeRoute }))
)
const WorkspaceRoute = lazy(() =>
  preloadWorkspaceRoute().then((module) => ({ default: module.WorkspaceRoute }))
)
const InventoryRoute = lazy(() =>
  preloadInventoryRoute().then((module) => ({ default: module.InventoryRoute }))
)
const RunsRoute = lazy(() =>
  preloadRunsRoute().then((module) => ({ default: module.RunsRoute }))
)
const RunDetailRoute = lazy(() =>
  preloadRunDetailRoute().then((module) => ({ default: module.RunDetailRoute }))
)
const TemplatesRoute = lazy(() =>
  preloadTemplatesRoute().then((module) => ({ default: module.TemplatesRoute }))
)
const RulesRoute = lazy(() =>
  preloadRulesRoute().then((module) => ({ default: module.RulesRoute }))
)

function RouteFallback() {
  return <div className="workspace-loading">Loading...</div>
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<HomeRoute />) },
  { path: '/projects/:projectId/workflows/:workflowId', element: withSuspense(<WorkspaceRoute />) },
  { path: '/projects/:projectId/inventory', element: withSuspense(<InventoryRoute />) },
  { path: '/projects/:projectId/runs', element: withSuspense(<RunsRoute />) },
  { path: '/projects/:projectId/runs/:runId', element: withSuspense(<RunDetailRoute />) },
  { path: '/projects/:projectId/templates', element: withSuspense(<TemplatesRoute />) },
  { path: '/projects/:projectId/rules', element: withSuspense(<RulesRoute />) },
  { path: '*', element: <Navigate to="/" replace /> },
])
