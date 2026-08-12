import type { Vec2 } from '../../geometry/Vec2'
import type { EditorElement, LineStyle, ShapeStyle } from '../../model/EditorElement'

export interface SvgElementRenderNode {
  id: string
  element: EditorElement
  transform: string
}

export function toSvgRenderNodes(elements: readonly EditorElement[]): SvgElementRenderNode[] {
  return elements
    .filter((element) => !element.hidden)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((element) => ({
      id: element.id,
      element,
      transform: getElementSvgTransform(element),
    }))
}

export function getElementSvgTransform(element: EditorElement): string {
  const transforms = [`translate(${formatNumber(element.x)} ${formatNumber(element.y)})`]
  if (element.rotation !== 0) {
    transforms.push(
      `rotate(${formatNumber(element.rotation)} ${formatNumber(element.width / 2)} ${formatNumber(element.height / 2)})`,
    )
  }
  return transforms.join(' ')
}

export function pointsToSvgPoints(points: readonly Vec2[]): string {
  return points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ')
}

export function freehandPointsToPath(points: readonly Vec2[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return [`M ${formatNumber(first.x)} ${formatNumber(first.y)}`, ...rest.map((point) => `L ${formatNumber(point.x)} ${formatNumber(point.y)}`)].join(' ')
}

export function getShapeStrokeDashArray(style: Pick<ShapeStyle | LineStyle, 'strokeStyle'>): string | undefined {
  if (style.strokeStyle === 'dashed') return '8 6'
  if (style.strokeStyle === 'dotted') return '2 5'
  return undefined
}

export function formatNumber(value: number): string {
  if (Object.is(value, -0)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}
