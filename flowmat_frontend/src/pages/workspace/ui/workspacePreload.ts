let workspaceRoutePromise: Promise<typeof import('./WorkspaceRoute')> | null = null
let workflowCanvasPagePromise: Promise<typeof import('./WorkflowCanvasPage')> | null = null
let canvasViewportPromise: Promise<typeof import('./CanvasViewport')> | null = null
let nodeInspectorPromise: Promise<typeof import('./NodeInspector')> | null = null
let connectionInspectorPromise: Promise<typeof import('./ConnectionInspector')> | null = null
let nodePickerPopupPromise: Promise<typeof import('./NodePickerPopup')> | null = null

export function preloadWorkspaceRoute() {
  workspaceRoutePromise ??= import('./WorkspaceRoute')
  return workspaceRoutePromise
}

export function preloadWorkflowCanvasPage() {
  workflowCanvasPagePromise ??= import('./WorkflowCanvasPage')
  return workflowCanvasPagePromise
}

export function preloadCanvasViewport() {
  canvasViewportPromise ??= import('./CanvasViewport')
  return canvasViewportPromise
}

export function preloadNodeInspector() {
  nodeInspectorPromise ??= import('./NodeInspector')
  return nodeInspectorPromise
}

export function preloadConnectionInspector() {
  connectionInspectorPromise ??= import('./ConnectionInspector')
  return connectionInspectorPromise
}

export function preloadNodePickerPopup() {
  nodePickerPopupPromise ??= import('./NodePickerPopup')
  return nodePickerPopupPromise
}

export function preloadWorkspaceExperience() {
  return Promise.all([
    preloadWorkspaceRoute(),
    preloadWorkflowCanvasPage(),
    preloadCanvasViewport(),
    preloadNodeInspector(),
    preloadConnectionInspector(),
    preloadNodePickerPopup(),
  ])
}
