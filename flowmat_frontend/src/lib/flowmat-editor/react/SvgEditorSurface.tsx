import type { PointerEvent } from 'react'
import { boxCenter } from '../geometry/Box2'
import { getElementBounds } from '../geometry/Bounds'
import { screenToCanvasPoint } from '../model/Camera'
import type { EditorDocument } from '../model/EditorDocument'
import type { EditorElement, LineStyle, ShapeStyle } from '../model/EditorElement'
import type { Vec2 } from '../geometry/Vec2'
import type { Box2 } from '../geometry/Box2'
import { getSelectedElementBounds } from '../selection/SelectionManager'
import {
  freehandPointsToPath,
  getShapeStrokeDashArray,
  pointsToSvgPoints,
  toSvgRenderNodes,
} from '../renderer/svg/SvgRenderer'

export interface SvgEditorPointerEvent {
  point: Vec2
  originalEvent: PointerEvent<SVGSVGElement>
}

interface Props {
  document: EditorDocument
  previewElement?: EditorElement | null
  marquee?: Box2 | null
  width?: number
  height?: number
  onPointerDown?: (event: SvgEditorPointerEvent) => void
  onPointerMove?: (event: SvgEditorPointerEvent) => void
  onPointerUp?: (event: SvgEditorPointerEvent) => void
}

export function SvgEditorSurface({
  document,
  previewElement,
  marquee,
  width = 1400,
  height = 900,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  const selectedIds = new Set(document.selectedIds)
  const elements = previewElement ? [...document.elements, previewElement] : document.elements
  const selectionBounds = getSelectedElementBounds(document)

  function toEditorPointerEvent(event: PointerEvent<SVGSVGElement>): SvgEditorPointerEvent {
    const rect = event.currentTarget.getBoundingClientRect()
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    return {
      point: screenToCanvasPoint(screenPoint, document.camera),
      originalEvent: event,
    }
  }

  return (
    <svg
      className="flowmat-editor-surface"
      role="application"
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      onPointerDown={(event) => onPointerDown?.(toEditorPointerEvent(event))}
      onPointerMove={(event) => onPointerMove?.(toEditorPointerEvent(event))}
      onPointerUp={(event) => onPointerUp?.(toEditorPointerEvent(event))}
      onPointerCancel={(event) => onPointerUp?.(toEditorPointerEvent(event))}
    >
      <defs>
        <pattern id="flowmat-editor-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(17,24,39,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="var(--surface)" />
      <g transform={`translate(${document.camera.x} ${document.camera.y}) scale(${document.camera.zoom})`}>
        <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#flowmat-editor-grid)" />
        {toSvgRenderNodes(elements).map((node) => (
          <SvgElementView
            key={node.id}
            element={node.element}
            transform={node.transform}
            selected={selectedIds.has(node.element.id)}
            preview={previewElement?.id === node.element.id}
          />
        ))}
        {document.elements.map((element) => (
          selectedIds.has(element.id) ? <SelectionOutline key={`${element.id}-selection`} element={element} /> : null
        ))}
        {selectionBounds && <SelectionHandles bounds={selectionBounds} />}
        {document.elements.map((element) => (
          selectedIds.has(element.id) && element.type === 'line' && element.rotation === 0
            ? <LineEndpointHandles key={`${element.id}-line-endpoints`} element={element} />
            : null
        ))}
        {marquee && <Marquee box={marquee} />}
      </g>
    </svg>
  )
}

export function SelectionHandles({ bounds }: { bounds: Box2 }) {
  const handles = [
    ['nw', bounds.x, bounds.y],
    ['n', bounds.x + bounds.width / 2, bounds.y],
    ['ne', bounds.x + bounds.width, bounds.y],
    ['e', bounds.x + bounds.width, bounds.y + bounds.height / 2],
    ['se', bounds.x + bounds.width, bounds.y + bounds.height],
    ['s', bounds.x + bounds.width / 2, bounds.y + bounds.height],
    ['sw', bounds.x, bounds.y + bounds.height],
    ['w', bounds.x, bounds.y + bounds.height / 2],
  ] as const
  const rotateX = bounds.x + bounds.width / 2
  const rotateY = bounds.y - 34

  return (
    <g className="flowmat-editor-selection-handles">
      <line
        x1={bounds.x + bounds.width / 2}
        y1={bounds.y}
        x2={rotateX}
        y2={rotateY}
        className="flowmat-editor-rotate-stem"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={rotateX}
        cy={rotateY}
        r={7}
        className="flowmat-editor-rotate-handle"
        data-editor-action="rotate"
        vectorEffect="non-scaling-stroke"
      />
      {handles.map(([handle, x, y]) => (
        <rect
          key={handle}
          x={x - 5}
          y={y - 5}
          width={10}
          height={10}
          rx={2}
          className="flowmat-editor-resize-handle"
          data-editor-action="resize"
          data-editor-handle={handle}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
}

function Marquee({ box }: { box: Box2 }) {
  return (
    <rect
      className="flowmat-editor-marquee"
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      vectorEffect="non-scaling-stroke"
    />
  )
}

export function SvgElementView({
  element,
  transform,
  selected,
  preview,
  interactive,
}: {
  element: EditorElement
  transform: string
  selected: boolean
  preview: boolean
  interactive?: boolean
}) {
  const className = `flowmat-editor-element${selected ? ' flowmat-editor-element--selected' : ''}${
    preview ? ' flowmat-editor-element--preview' : ''
  }${interactive ? ' flowmat-editor-element--interactive' : ''}`

  switch (element.type) {
    case 'rectangle':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            rx={element.cornerRadius}
            ry={element.cornerRadius}
            {...shapeStyleAttrs(element.style)}
          />
        </g>
      )
    case 'ellipse':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <ellipse
            cx={element.width / 2}
            cy={element.height / 2}
            rx={element.width / 2}
            ry={element.height / 2}
            {...shapeStyleAttrs(element.style)}
          />
        </g>
      )
    case 'polygon':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <polygon points={pointsToSvgPoints(element.points)} {...shapeStyleAttrs(element.style)} />
        </g>
      )
    case 'line':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <line
            x1={element.start.x}
            y1={element.start.y}
            x2={element.end.x}
            y2={element.end.y}
            {...lineStyleAttrs(element.style)}
          />
        </g>
      )
    case 'freehand':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <path d={freehandPointsToPath(element.points)} fill="none" {...lineStyleAttrs(element.style)} />
        </g>
      )
    case 'text':
      return (
        <g transform={transform} opacity={element.opacity} className={className} data-element-id={element.id}>
          <text
            x={0}
            y={element.style.fontSize}
            fill={element.style.color}
            fontFamily={element.style.fontFamily}
            fontSize={element.style.fontSize}
            fontWeight={element.style.fontWeight}
            opacity={element.style.opacity}
          >
            {element.text}
          </text>
        </g>
      )
    case 'group':
      return null
  }
}

export function SelectionOutline({ element }: { element: EditorElement }) {
  const bounds = getElementBounds(element)
  const center = boxCenter(bounds)
  return (
    <rect
      className="flowmat-editor-selection"
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      transform={element.rotation === 0 ? undefined : `rotate(${element.rotation} ${center.x} ${center.y})`}
      vectorEffect="non-scaling-stroke"
    />
  )
}

export function LineEndpointHandles({ element }: { element: Extract<EditorElement, { type: 'line' }> }) {
  return (
    <g transform={`translate(${element.x} ${element.y})`} className="flowmat-editor-line-endpoint-handles">
      <circle
        cx={element.start.x}
        cy={element.start.y}
        r={6}
        className="flowmat-editor-line-endpoint-handle"
        data-element-id={element.id}
        data-editor-action="line-endpoint"
        data-editor-endpoint="start"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={element.end.x}
        cy={element.end.y}
        r={6}
        className="flowmat-editor-line-endpoint-handle"
        data-element-id={element.id}
        data-editor-action="line-endpoint"
        data-editor-endpoint="end"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}

function shapeStyleAttrs(style: ShapeStyle) {
  return {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: getShapeStrokeDashArray(style),
    opacity: style.opacity,
    vectorEffect: 'non-scaling-stroke' as const,
  }
}

function lineStyleAttrs(style: LineStyle) {
  return {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: getShapeStrokeDashArray(style),
    opacity: style.opacity,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
}
