import type { BatchCanvasAnnotationInput } from '../../../entities/canvas-annotation/api/canvasAnnotationApi'
import {
  computeAlignedPosition,
  computeDistributedPositions,
  computeSelectionBounds,
  type AlignDirection,
  type DistributeAxis,
} from '../../../entities/canvas-annotation/model/annotationLayout'
import type { CanvasAnnotationViewModel } from '../../../entities/workflow/model/types'
import type { RibbonButtonHandlers } from '../../../widgets/canvas-toolbar/config/ribbonConfig'
import type { WorkspaceEditorCommandApi, WorkspaceEditorSelectionSnapshot } from '../ui/WorkspaceEditorLayer'

interface Options {
  selection: WorkspaceEditorSelectionSnapshot
  editable: boolean
  editorApi: Pick<WorkspaceEditorCommandApi, 'alignSelected' | 'distributeSelected' | 'groupSelected' | 'ungroupSelected'> | null
  annotations: readonly CanvasAnnotationViewModel[]
  batchAnnotations(input: BatchCanvasAnnotationInput): Promise<unknown>
  onError(message: string): void
}

export function createWorkspaceSelectionCommands({
  selection, editable, editorApi, annotations, batchAnnotations, onError,
}: Options): RibbonButtonHandlers {
  const ids = new Set<string>(selection.selectedIds)
  const selectedAnnotations = annotations.filter((annotation) => ids.has(annotation.annotationId))
  const annotationSelectionReady = selectedAnnotations.length === ids.size
  const layoutReady = editable && (
    (selection.selectionKind === 'backend' && editorApi !== null) ||
    (selection.selectionKind === 'annotation' && annotationSelectionReady)
  )
  const canAlign = layoutReady && selection.canAlign
  const canDistribute = layoutReady && selection.canDistribute
  const canGroup = editable && editorApi !== null && selection.canGroup
  const canUngroup = editable && editorApi !== null && selection.canUngroup
  const boxes = selectedAnnotations.map((annotation) => ({
    id: annotation.annotationId,
    x: annotation.position.x, y: annotation.position.y,
    width: annotation.size.width, height: annotation.size.height,
  }))

  async function run(action: () => unknown) {
    try {
      await action()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to update selected shapes.')
    }
  }

  function layoutTitle(title: string, minimum: number, enabled: boolean) {
    if (!editable) return 'Viewers cannot edit shapes.'
    if (selection.selectionKind === 'mixed') return 'Select shapes of the same kind to align or distribute.'
    return enabled ? title : `Select at least ${minimum} shapes of the same kind.`
  }

  function align(direction: AlignDirection) {
    if (!canAlign) return
    return run(() => {
      if (selection.selectionKind === 'backend') return editorApi?.alignSelected(direction)
      if (boxes.length < 2) return
      const bounds = computeSelectionBounds(boxes)
      return batchAnnotations({ items: boxes.map((box) => {
        const position = computeAlignedPosition(box, bounds, direction)
        return { annotationId: box.id, posX: position.x, posY: position.y }
      }) })
    })
  }

  function distribute(axis: DistributeAxis) {
    if (!canDistribute) return
    return run(() => {
      if (selection.selectionKind === 'backend') return editorApi?.distributeSelected(axis)
      if (boxes.length < 3) return
      return batchAnnotations({ items: computeDistributedPositions(boxes, axis).map((position) => ({
        annotationId: position.id, posX: position.x, posY: position.y,
      })) })
    })
  }

  const alignments: Array<[string, AlignDirection, string]> = [
    ['align-left', 'left', 'Align left'],
    ['align-center-x', 'centerX', 'Align center'],
    ['align-right', 'right', 'Align right'],
    ['align-top', 'top', 'Align top'],
    ['align-center-y', 'centerY', 'Align middle'],
    ['align-bottom', 'bottom', 'Align bottom'],
  ]
  const commands: RibbonButtonHandlers = {}
  for (const [id, direction, title] of alignments) {
    commands[id] = {
      onClick: () => align(direction), disabled: !canAlign,
      title: layoutTitle(title, 2, canAlign),
    }
  }
  for (const axis of ['horizontal', 'vertical'] as const) {
    commands[`distribute-${axis}`] = {
      onClick: () => distribute(axis), disabled: !canDistribute,
      title: layoutTitle(`Distribute ${axis === 'horizontal' ? 'horizontally' : 'vertically'}`, 3, canDistribute),
    }
  }
  commands.group = {
    onClick: () => { if (canGroup) return run(() => editorApi?.groupSelected()) },
    disabled: !canGroup,
    title: canGroup
      ? (selection.selectionKind === 'mixed' ? 'Group each kind of selected shape separately.' : 'Group selected shapes')
      : 'Select at least two shapes of the same kind to group.',
  }
  commands.ungroup = {
    onClick: () => { if (canUngroup) return run(() => editorApi?.ungroupSelected()) },
    disabled: !canUngroup,
    title: canUngroup ? 'Ungroup selected shapes' : 'Select grouped shapes to ungroup.',
  }
  return commands
}
