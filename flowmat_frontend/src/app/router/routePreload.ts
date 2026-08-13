let inventoryRoutePromise: Promise<typeof import('../../pages/inventory/ui/InventoryRoute')> | null = null
let runsRoutePromise: Promise<typeof import('../../pages/runs/ui/RunsRoute')> | null = null
let runDetailRoutePromise: Promise<typeof import('../../pages/runs/ui/RunDetailRoute')> | null = null
let templatesRoutePromise: Promise<typeof import('../../pages/templates/ui/TemplatesRoute')> | null = null
let rulesRoutePromise: Promise<typeof import('../../pages/rules/ui/RulesRoute')> | null = null

export function preloadInventoryRoute() {
  inventoryRoutePromise ??= import('../../pages/inventory/ui/InventoryRoute')
  return inventoryRoutePromise
}

export function preloadRunsRoute() {
  runsRoutePromise ??= import('../../pages/runs/ui/RunsRoute')
  return runsRoutePromise
}

export function preloadRunDetailRoute() {
  runDetailRoutePromise ??= import('../../pages/runs/ui/RunDetailRoute')
  return runDetailRoutePromise
}

export function preloadTemplatesRoute() {
  templatesRoutePromise ??= import('../../pages/templates/ui/TemplatesRoute')
  return templatesRoutePromise
}

export function preloadRulesRoute() {
  rulesRoutePromise ??= import('../../pages/rules/ui/RulesRoute')
  return rulesRoutePromise
}
