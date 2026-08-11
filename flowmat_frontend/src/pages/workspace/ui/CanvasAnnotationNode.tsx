import { useEffect, useMemo, useRef, useState } from 'react'
import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import type { CanvasAnnotationPoint, CanvasAnnotationViewModel } from '../../../entities/workflow/model/types'

type AnnotationNodeData = CanvasAnnotationViewModel & {
  onDelete(annotationId: string): void
  onCommitText?(annotationId: string, text: string): void
  canEdit: boolean
}

const SHAPE_STYLES: Record<string, React.CSSProperties> = {
  rectangle: { borderRadius: 16 },
  ellipse: { borderRadius: '999px' },
  diamond: { transform: 'rotate(45deg)' },
}

function resolveStroke(style: Record<string, unknown>): string {
  return typeof style.stroke === 'string' ? style.stroke : 'var(--text-h)'
}

function resolveFill(style: Record<string, unknown>): string {
  return typeof style.fill === 'string' ? style.fill : 'transparent'
}

function resolveStrokeWidth(style: Record<string, unknown>): number {
  return typeof style.strokeWidth === 'number' ? style.strokeWidth : 2
}

function computeFreehandBounds(points: CanvasAnnotationPoint[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, width: 1, height: 1 }
  }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function buildFreehandPath(points: CanvasAnnotationPoint[], width: number, height: number) {
  if (points.length === 0) return ''
  const bounds = computeFreehandBounds(points)
  const scaleX = width / bounds.width
  const scaleY = height / bounds.height
  return points
    .map((point, index) => {
      const x = (point.x - bounds.minX) * scaleX
      const y = (point.y - bounds.minY) * scaleY
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export function CanvasAnnotationNode({ data, selected }: NodeProps) {
  const annotation = data as unknown as AnnotationNodeData
  const stroke = resolveStroke(annotation.style)
  const fill = resolveFill(annotation.style)
  const strokeWidth = resolveStrokeWidth(annotation.style)

  const [isEditingText, setIsEditingText] = useState(false)
  const [draftText, setDraftText] = useState(annotation.textContent ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // If the server-side text changes while we're not editing (e.g. a
  // collaborator updated it), keep the draft in sync so it's fresh
  // whenever editing starts.
  useEffect(() => {
    if (!isEditingText) setDraftText(annotation.textContent ?? '')
  }, [annotation.textContent, isEditingText])

  useEffect(() => {
    if (isEditingText) {
      const el = textareaRef.current
      el?.focus()
      el?.select()
    }
  }, [isEditingText])

  function startEditing() {
    if (!annotation.canEdit) return
    setDraftText(annotation.textContent ?? '')
    setIsEditingText(true)
  }

  function commitEditing() {
    setIsEditingText(false)
    annotation.onCommitText?.(annotation.annotationId, draftText)
  }

  function cancelEditing() {
    setDraftText(annotation.textContent ?? '')
    setIsEditingText(false)
  }

  const freehandPath = useMemo(
    () => buildFreehandPath(annotation.points, annotation.size.width, annotation.size.height),
    [annotation.points, annotation.size.height, annotation.size.width]
  )

  return (
    <div
      className={`canvas-annotation ${selected ? 'canvas-annotation--selected' : ''} ${
        annotation.annotationType === 'freehand' ? 'canvas-annotation--freehand' : ''
      }`}
      style={{
        width: '100%',
        height: '100%',
        transform:
          annotation.annotationType === 'shape' && annotation.shapeKind === 'diamond'
            ? 'rotate(45deg)'
            : undefined,
      }}
    >
      {annotation.canEdit && (
        <NodeToolbar isVisible={selected} position={Position.Top} offset={6} align="center">
          <div className="node-toolbar__group">
            {annotation.annotationType === 'text' && annotation.canEdit && (
              <button
                type="button"
                className="node-toolbar__btn nodrag nopan"
                onClick={(event) => {
                  event.stopPropagation()
                  startEditing()
                }}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="node-toolbar__btn node-toolbar__btn--delete nodrag nopan"
              onClick={(event) => {
                event.stopPropagation()
                annotation.onDelete(annotation.annotationId)
              }}
            >
              Del
            </button>
          </div>
        </NodeToolbar>
      )}
      <NodeResizer
        isVisible={selected && annotation.canEdit}
        minWidth={annotation.annotationType === 'text' ? 120 : 48}
        minHeight={annotation.annotationType === 'text' ? 48 : 48}
        lineStyle={{ borderColor: 'var(--accent)', borderWidth: 1 }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: 'white',
          border: '1.5px solid var(--accent)',
        }}
      />
      {annotation.annotationType === 'shape' && (
        <div
          className="canvas-annotation__shape"
          style={{
            width: '100%',
            height: '100%',
            border: `${strokeWidth}px solid ${stroke}`,
            background: fill,
            ...(annotation.shapeKind ? SHAPE_STYLES[annotation.shapeKind] ?? {} : {}),
          }}
        />
      )}
      {annotation.annotationType === 'text' && (
        <div
          className="canvas-annotation__text"
          style={{
            color: stroke,
            background: fill === 'transparent' ? 'transparent' : fill,
            border: `${strokeWidth}px solid ${stroke}`,
          }}
          onDoubleClick={(event) => {
            event.stopPropagation()
            startEditing()
          }}
        >
          {isEditingText ? (
            <textarea
              ref={textareaRef}
              className="canvas-annotation__text-input nodrag nopan"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onBlur={commitEditing}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  commitEditing()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelEditing()
                }
                event.stopPropagation()
              }}
              style={{ color: stroke }}
            />
          ) : (
            <span>{annotation.textContent || 'Text'}</span>
          )}
        </div>
      )}
      {annotation.annotationType === 'freehand' && (
        <svg
          className="canvas-annotation__freehand"
          viewBox={`0 0 ${annotation.size.width} ${annotation.size.height}`}
        >
          <path d={freehandPath} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}