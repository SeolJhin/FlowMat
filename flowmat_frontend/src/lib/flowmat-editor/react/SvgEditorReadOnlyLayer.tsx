import type { CSSProperties } from 'react'
import type { EditorDocument } from '../model/EditorDocument'
import { toSvgRenderNodes } from '../renderer/svg/SvgRenderer'
import { SvgElementView } from './SvgEditorSurface'

interface Props {
  document: EditorDocument
  className?: string
  style?: CSSProperties
}

export function SvgEditorReadOnlyLayer({ document, className, style }: Props) {
  const nodes = toSvgRenderNodes(document.elements)
  if (nodes.length === 0) return null

  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
      style={style}
    >
      <g transform={`translate(${document.camera.x} ${document.camera.y}) scale(${document.camera.zoom})`}>
        {nodes.map((node) => (
          <SvgElementView
            key={node.id}
            element={node.element}
            transform={node.transform}
            selected={false}
            preview={false}
          />
        ))}
      </g>
    </svg>
  )
}
