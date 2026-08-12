import { describe, expect, it } from 'vitest'
import type { CanvasAnnotationDto, WorkflowGraphChangeDto } from '../../../shared/types/api'
import { applyGraphChangesToCanvas } from './applyGraphChangesToCanvas'
import { buildWorkflowCanvasViewModel } from './toWorkflowCanvasViewModel'

describe('applyGraphChangesToCanvas', () => {
  it('applies annotation create, update, and delete graph changes without duplicating annotations', () => {
    const canvas = buildWorkflowCanvasViewModel(
      {
        workflowId: 'workflow-1',
        projectId: 'project-1',
        workflowName: 'Flow',
        workflowDesc: null,
        workflowType: 'standard',
        workflowStatus: 'draft',
        currentUserRole: 'owner',
      },
      1,
      [],
      [],
      [],
    )

    const created = applyGraphChangesToCanvas(canvas, [
      graphChange(2, 'ANNOTATION_CREATED', 'annotation-1', annotation({ annotationId: 'annotation-1', posX: 10 })),
    ])

    expect(created.graphSeq).toBe(2)
    expect(created.annotations).toHaveLength(1)
    expect(created.annotationMap['annotation-1'].position.x).toBe(10)

    const updated = applyGraphChangesToCanvas(created, [
      graphChange(3, 'ANNOTATION_UPDATED', 'annotation-1', annotation({ annotationId: 'annotation-1', posX: 80 })),
    ])

    expect(updated.graphSeq).toBe(3)
    expect(updated.annotations).toHaveLength(1)
    expect(updated.annotationMap['annotation-1'].position.x).toBe(80)

    const deleted = applyGraphChangesToCanvas(updated, [
      graphChange(4, 'ANNOTATION_DELETED', 'annotation-1', null),
    ])

    expect(deleted.graphSeq).toBe(4)
    expect(deleted.annotations).toEqual([])
    expect(deleted.annotationMap).toEqual({})
  })
})

function graphChange(
  seq: number,
  changeType: string,
  entityId: string,
  annotationPayload: CanvasAnnotationDto | null,
): WorkflowGraphChangeDto {
  return {
    seq,
    changeType,
    workflowId: 'workflow-1',
    entityId,
    userId: 'user-1',
    timestamp: 1,
    payload: annotationPayload
      ? {
          workflow: null,
          process: null,
          processIos: [],
          connection: null,
          annotation: annotationPayload,
        }
      : null,
  }
}

function annotation(input: Partial<CanvasAnnotationDto>): CanvasAnnotationDto {
  return {
    annotationId: 'annotation-1',
    workflowId: 'workflow-1',
    projectId: 'project-1',
    annotationType: 'shape',
    shapeKind: 'rectangle',
    posX: 0,
    posY: 0,
    width: 160,
    height: 96,
    rotation: 0,
    points: [],
    textContent: null,
    style: { stroke: '#111827', fill: 'transparent' },
    zIndex: '1',
    groupId: null,
    lockedYn: 'N',
    version: 1,
    versionNonce: 1,
    ...input,
  }
}
