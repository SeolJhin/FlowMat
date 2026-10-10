type Position = { x: number; y: number }
type LocalNode = { position: Position; dragging?: boolean }

/** Reconcile persisted positions without losing a local drag that has not been saved yet. */
export function canvasNodePosition(
  incoming: Position,
  previousServerPosition: Position | undefined,
  local: LocalNode | undefined,
): Position {
  if (!local) return incoming
  if (local.dragging) return local.position
  if (!previousServerPosition
    || incoming.x !== previousServerPosition.x
    || incoming.y !== previousServerPosition.y) return incoming
  // Selection/presence updates can still contain the old coordinates while a drag save is pending.
  return local.position
}
