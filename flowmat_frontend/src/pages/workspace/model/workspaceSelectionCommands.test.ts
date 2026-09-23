import { describe, expect, it, vi } from 'vitest'
import type { CanvasAnnotationViewModel } from '../../../entities/workflow/model/types'
import type { WorkspaceEditorCommandApi, WorkspaceEditorSelectionSnapshot } from '../ui/WorkspaceEditorLayer'
import { toElementId } from '../../../lib/flowmat-editor'
import { buildRibbonTabs } from '../../../widgets/canvas-toolbar/config/ribbonConfig'
import { createWorkspaceSelectionCommands } from './workspaceSelectionCommands'

function annotation(id: string, x: number, y: number): CanvasAnnotationViewModel {
  return {
    id, annotationId: id, workflowId: 'workflow', projectId: 'project',
    annotationType: 'shape', shapeKind: 'rectangle',
    position: { x, y }, size: { width: 10, height: 10 }, rotation: 0,
    points: [], textContent: null, style: {}, zIndex: id, groupId: null,
    locked: false, version: 1, versionNonce: 1,
  }
}

const annotations = [annotation('a', 10, 20), annotation('b', 50, 80), annotation('c', 100, 160)]

function setup(overrides: Partial<WorkspaceEditorSelectionSnapshot> = {}, editable = true) {
  const selection: WorkspaceEditorSelectionSnapshot = {
    selectedIds: [toElementId('a'), toElementId('b')], elements: [],
    selectionKind: 'annotation', canAlign: true, canDistribute: false,
    canGroup: true, canUngroup: false, canUndo: false, canRedo: false,
    ...overrides,
  }
  const editorApi = {
    alignSelected: vi.fn(), distributeSelected: vi.fn(),
    groupSelected: vi.fn(), ungroupSelected: vi.fn(),
  } satisfies Pick<WorkspaceEditorCommandApi, 'alignSelected' | 'distributeSelected' | 'groupSelected' | 'ungroupSelected'>
  const batchAnnotations = vi.fn().mockResolvedValue(undefined)
  const onError = vi.fn()
  const options = { selection, editable, editorApi, annotations, batchAnnotations, onError }
  return { options, editorApi, batchAnnotations, onError, commands: createWorkspaceSelectionCommands(options) }
}

describe('workspace ribbon selection commands', () => {
  it.each([
    ['align-left', [10, 20], [10, 80]],
    ['align-center-x', [30, 20], [30, 80]],
    ['align-right', [50, 20], [50, 80]],
    ['align-top', [10, 20], [50, 20]],
    ['align-center-y', [10, 50], [50, 50]],
    ['align-bottom', [10, 80], [50, 80]],
  ] as const)('routes %s for annotations to the annotation batch API', async (command, first, second) => {
    const { commands, batchAnnotations, editorApi } = setup()
    await commands[command].onClick()
    expect(batchAnnotations).toHaveBeenCalledExactlyOnceWith({ items: [
      { annotationId: 'a', posX: first[0], posY: first[1] },
      { annotationId: 'b', posX: second[0], posY: second[1] },
    ] })
    expect(editorApi.alignSelected).not.toHaveBeenCalled()
  })

  it.each([
    ['distribute-horizontal', 55, 80],
    ['distribute-vertical', 50, 90],
  ] as const)('routes %s for three annotations to the annotation batch API', async (command, x, y) => {
    const { commands, batchAnnotations, editorApi } = setup({
      selectedIds: annotations.map((item) => toElementId(item.id)), canDistribute: true,
    })
    await commands[command].onClick()
    expect(batchAnnotations).toHaveBeenCalledOnce()
    expect(batchAnnotations.mock.calls[0][0].items).toContainEqual({ annotationId: 'b', posX: x, posY: y })
    expect(editorApi.distributeSelected).not.toHaveBeenCalled()
  })

  it('routes backend layout through the editor document commands', async () => {
    const { commands, editorApi, batchAnnotations } = setup({ selectionKind: 'backend', canDistribute: true })
    await commands['align-left'].onClick()
    await commands['distribute-horizontal'].onClick()
    expect(editorApi.alignSelected).toHaveBeenCalledExactlyOnceWith('left')
    expect(editorApi.distributeSelected).toHaveBeenCalledExactlyOnceWith('horizontal')
    expect(batchAnnotations).not.toHaveBeenCalled()
  })

  it('disables mixed layout and guards direct calls even with stale capability flags', async () => {
    const { commands, editorApi, batchAnnotations } = setup({ selectionKind: 'mixed', canAlign: true, canDistribute: true })
    for (const key of ['align-left', 'distribute-horizontal']) {
      expect(commands[key].disabled).toBe(true)
      expect(commands[key].title).toContain('same kind')
      await commands[key].onClick()
    }
    expect(editorApi.alignSelected).not.toHaveBeenCalled()
    expect(editorApi.distributeSelected).not.toHaveBeenCalled()
    expect(batchAnnotations).not.toHaveBeenCalled()
  })

  it('disables all mutation commands for viewers even with stale selection flags', async () => {
    const { commands, editorApi, batchAnnotations } = setup({ canDistribute: true, canUngroup: true }, false)
    for (const command of Object.values(commands)) {
      expect(command.disabled).toBe(true)
      await command.onClick()
    }
    for (const callback of Object.values(editorApi)) expect(callback).not.toHaveBeenCalled()
    expect(batchAnnotations).not.toHaveBeenCalled()
  })

  it('does not write when selection capabilities are unavailable', async () => {
    const { commands, batchAnnotations, editorApi } = setup({
      selectionKind: 'none', selectedIds: [], canAlign: false, canDistribute: false, canGroup: false, canUngroup: false,
    })
    for (const command of Object.values(commands)) {
      expect(command.disabled).toBe(true)
      await command.onClick()
    }
    expect(batchAnnotations).not.toHaveBeenCalled()
    for (const callback of Object.values(editorApi)) expect(callback).not.toHaveBeenCalled()
  })

  it('uses the shared editor grouping commands for annotation and mixed groups', async () => {
    for (const selectionKind of ['annotation', 'backend', 'mixed'] as const) {
      const { commands, editorApi, batchAnnotations } = setup({ selectionKind, canGroup: true, canUngroup: true })
      await commands.group.onClick()
      await commands.ungroup.onClick()
      expect(editorApi.groupSelected).toHaveBeenCalledOnce()
      expect(editorApi.ungroupSelected).toHaveBeenCalledOnce()
      expect(batchAnnotations).not.toHaveBeenCalled()
    }
  })

  it('does not ungroup items without group membership', async () => {
    const { commands, editorApi } = setup()
    expect(commands.ungroup.disabled).toBe(true)
    await commands.ungroup.onClick()
    expect(editorApi.ungroupSelected).not.toHaveBeenCalled()
  })

  it('does not enable editor commands before the editor API is ready', async () => {
    const { options, batchAnnotations } = setup({ selectionKind: 'backend', canUngroup: true, canDistribute: true })
    const commands = createWorkspaceSelectionCommands({ ...options, editorApi: null })
    for (const command of Object.values(commands)) {
      expect(command.disabled).toBe(true)
      await command.onClick()
    }
    expect(batchAnnotations).not.toHaveBeenCalled()
  })

  it('ignores stale annotation IDs instead of issuing partial layout updates', async () => {
    const { options, batchAnnotations } = setup()
    const commands = createWorkspaceSelectionCommands({ ...options, annotations: annotations.slice(0, 1) })
    await commands['align-left'].onClick()
    expect(batchAnnotations).not.toHaveBeenCalled()
  })

  it('reports failed annotation persistence without an unhandled rejection', async () => {
    const { commands, batchAnnotations, onError } = setup()
    batchAnnotations.mockRejectedValue(new Error('Save failed'))
    await commands['align-left'].onClick()
    expect(onError).toHaveBeenCalledExactlyOnceWith('Save failed')
  })

  it('reports non-Error persistence failures with a useful fallback', async () => {
    const { commands, batchAnnotations, onError } = setup()
    batchAnnotations.mockRejectedValue('offline')
    await commands['align-left'].onClick()
    expect(onError).toHaveBeenCalledExactlyOnceWith('Failed to update selected shapes.')
  })

  it('passes selection enablement into the actual Annotate ribbon definition', () => {
    const { commands } = setup({ selectionKind: 'mixed', canAlign: false, canDistribute: false, canGroup: false })
    const buttons = buildRibbonTabs(commands).find((tab) => tab.id === 'annotate')!.groups.flatMap((group) => group.buttons)
    expect(buttons.find((button) => button.id === 'align-left')?.disabled).toBe(true)
    expect(buttons.find((button) => button.id === 'group')?.disabled).toBe(true)
    expect(buttons.find((button) => button.id === 'align-left')?.onClick).toBe(commands['align-left'].onClick)
  })
})
