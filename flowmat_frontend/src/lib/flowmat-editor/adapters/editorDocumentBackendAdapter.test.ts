import { describe, expect, it } from 'vitest'
import { createEllipseElement } from '../elements/EllipseElement'
import { createLineElement } from '../elements/LineElement'
import { createRectangleElement } from '../elements/RectangleElement'
import { createTriangleElement } from '../elements/PolygonElement'
import { createEmptyEditorDocument } from '../model/EditorDocument'
import { toElementId } from '../model/ElementId'
import {
  backendDtoToEditorDocument,
  editorDocumentToBackendSaveInput,
  type BackendEditorDocumentDto,
} from './editorDocumentBackendAdapter'

describe('editorDocumentBackendAdapter', () => {
  it('maps editor elements into backend geometry payloads', () => {
    const doc = {
      ...createEmptyEditorDocument({ nextElementSeq: 5 }),
      elements: [
        createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 80, height: 40, cornerRadius: 4 }),
        createTriangleElement({ id: toElementId('tri-1'), x: 100, y: 0, width: 80, height: 70 }),
        createLineElement({ id: toElementId('line-1'), start: { x: 200, y: 10 }, end: { x: 260, y: 60 } }),
      ],
    }

    const payload = editorDocumentToBackendSaveInput(doc)

    expect(payload.elements).toHaveLength(3)
    expect(payload.elements[0]).toMatchObject({
      id: 'rect-1',
      type: 'rectangle',
      geometry: { cornerRadius: 4 },
    })
    expect(payload.elements[1].geometry).toMatchObject({ closed: true })
    expect(payload.elements[2].geometry).toMatchObject({
      start: { x: 0, y: 0 },
      end: { x: 60, y: 50 },
    })
  })

  it('hydrates backend documents into validated editor documents', () => {
    const rectangle = createRectangleElement({ id: toElementId('rect-1'), x: 0, y: 0, width: 80, height: 40 })
    const ellipse = createEllipseElement({ id: toElementId('ellipse-1'), x: 100, y: 0, width: 80, height: 40 })
    const payload = editorDocumentToBackendSaveInput({
      ...createEmptyEditorDocument({ nextElementSeq: 3 }),
      elements: [rectangle, ellipse],
    })
    const dto: BackendEditorDocumentDto = {
      ...payload,
      version: 2,
      versionNonce: 123,
      elements: payload.elements.map((element, index) => ({
        ...element,
        version: index + 1,
        versionNonce: index + 10,
      })),
    }

    const doc = backendDtoToEditorDocument(dto)

    expect(doc.elements.map((element) => element.id)).toEqual(['rect-1', 'ellipse-1'])
    expect(doc.selectedIds).toEqual([])
    expect(doc.nextElementSeq).toBe(3)
  })
})
