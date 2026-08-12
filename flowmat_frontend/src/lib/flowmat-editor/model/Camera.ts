import type { Vec2 } from '../geometry/Vec2'

export interface Camera {
  x: number
  y: number
  zoom: number
}

export const DEFAULT_CAMERA: Camera = Object.freeze({ x: 0, y: 0, zoom: 1 })

export function createCamera(input: Partial<Camera> = {}): Camera {
  const camera = {
    x: input.x ?? DEFAULT_CAMERA.x,
    y: input.y ?? DEFAULT_CAMERA.y,
    zoom: input.zoom ?? DEFAULT_CAMERA.zoom,
  }
  assertValidCamera(camera)
  return camera
}

export function screenToCanvasPoint(point: Vec2, camera: Camera): Vec2 {
  assertValidCamera(camera)
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  }
}

export function canvasToScreenPoint(point: Vec2, camera: Camera): Vec2 {
  assertValidCamera(camera)
  return {
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  }
}

export function zoomCameraAtScreenPoint(camera: Camera, screenPoint: Vec2, nextZoom: number): Camera {
  const canvasPoint = screenToCanvasPoint(screenPoint, camera)
  return createCamera({
    x: screenPoint.x - canvasPoint.x * nextZoom,
    y: screenPoint.y - canvasPoint.y * nextZoom,
    zoom: nextZoom,
  })
}

function assertValidCamera(camera: Camera) {
  if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y)) {
    throw new Error('Camera position must be finite.')
  }
  if (!Number.isFinite(camera.zoom) || camera.zoom <= 0) {
    throw new Error('Camera zoom must be a positive finite number.')
  }
}
