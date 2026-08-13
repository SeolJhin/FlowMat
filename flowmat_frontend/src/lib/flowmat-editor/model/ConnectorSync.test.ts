import { describe, expect, it } from 'vitest'
import { createLineElement } from '../elements/LineElement'
import { createRectangleElement } from '../elements/RectangleElement'
import { translateElement } from '../geometry/Transform'
import { recomputeBoundLines } from './ConnectorSync'
import { createEmptyEditorDocument, insertElement, replaceElement } from './EditorDocument'
import { toElementId } from './ElementId'

describe('ConnectorSync', () => {
  it('recomputes a bound line endpoint after its anchor element moves', () => {
    const anchorA = createRectangleElement({ id: toElementId('rect-a'), x: 0, y: 0, width: 40, height: 40 })
    const anchorB = createRectangleElement({ id: toElementId('rect-b'), x: 100, y: 0, width: 40, height: 40 })
    const connector = createLineElement({
      id: toElementId('line-1'),
      start: { x: 40, y: 20 },
      end: { x: 100, y: 20 },
      startBinding: { elementId: anchorA.id, anchor: 'right' },
      endBinding: { elementId: anchorB.id, anchor: 'left' },
    })
    let doc = insertElement(insertElement(insertElement(createEmptyEditorDocument(), anchorA), anchorB), connector)

    const movedAnchorA = translateElement(anchorA, { x: 50, y: 50 })
    doc = replaceElement(doc, movedAnchorA)

    const next = recomputeBoundLines(doc, [anchorA.id])
    const nextLine = next.elements.find((element) => element.id === connector.id)

    expect(nextLine).toMatchObject({
      startBinding: { elementId: anchorA.id, anchor: 'right' },
      endBinding: { elementId: anchorB.id, anchor: 'left' },
    })
    if (nextLine?.type === 'line') {
      // world-space start now sits at anchorA's new right-edge midpoint
      expect(nextLine.x + nextLine.start.x).toBeCloseTo(movedAnchorA.x + movedAnchorA.width)
      expect(nextLine.y + nextLine.start.y).toBeCloseTo(movedAnchorA.y + movedAnchorA.height / 2)
      // end stays at anchorB, which didn't move
      expect(nextLine.x + nextLine.end.x).toBeCloseTo(anchorB.x)
      expect(nextLine.y + nextLine.end.y).toBeCloseTo(anchorB.y + anchorB.height / 2)
    }
  })

  it('leaves unbound lines untouched', () => {
    const anchorA = createRectangleElement({ id: toElementId('rect-a'), x: 0, y: 0, width: 40, height: 40 })
    const freeLine = createLineElement({ id: toElementId('line-free'), start: { x: 0, y: 0 }, end: { x: 10, y: 10 } })
    const doc = insertElement(insertElement(createEmptyEditorDocument(), anchorA), freeLine)

    const next = recomputeBoundLines(doc, [anchorA.id])

    expect(next.elements.find((element) => element.id === freeLine.id)).toEqual(freeLine)
  })

  it('is a no-op when nothing moved', () => {
    const doc = createEmptyEditorDocument()
    expect(recomputeBoundLines(doc, [])).toBe(doc)
  })
})
