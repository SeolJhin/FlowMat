import { beforeEach, describe, expect, it } from 'vitest'
import {
  computeAlignedPosition,
  computeDistributedPositions,
  computeSelectionBounds,
  type LayoutBox,
} from '../entities/canvas-annotation/model/annotationLayout'
import { useWorkspaceStore } from '../pages/workspace/model/workspaceStore'

const boxes: LayoutBox[] = [
  { id: 'a', x: 10, y: 20, width: 20, height: 10 },
  { id: 'b', x: 60, y: 40, width: 30, height: 20 },
  { id: 'c', x: 120, y: 10, width: 10, height: 30 },
]

describe('Canvas Components', () => {
  describe('CanvasViewport', () => {
    it('computes a viewport selection bounding box', () => {
      expect(computeSelectionBounds(boxes)).toEqual({ left: 10, top: 10, right: 130, bottom: 60 })
    })

    it('returns a zero bounding box for an empty canvas selection', () => {
      expect(computeSelectionBounds([])).toEqual({ left: 0, top: 0, right: 0, bottom: 0 })
    })

    it('aligns selected elements to each supported edge and center', () => {
      const bounds = computeSelectionBounds(boxes)
      expect(computeAlignedPosition(boxes[1], bounds, 'left')).toEqual({ x: 10, y: 40 })
      expect(computeAlignedPosition(boxes[1], bounds, 'centerX')).toEqual({ x: 55, y: 40 })
      expect(computeAlignedPosition(boxes[1], bounds, 'right')).toEqual({ x: 100, y: 40 })
      expect(computeAlignedPosition(boxes[1], bounds, 'top')).toEqual({ x: 60, y: 10 })
      expect(computeAlignedPosition(boxes[1], bounds, 'centerY')).toEqual({ x: 60, y: 25 })
      expect(computeAlignedPosition(boxes[1], bounds, 'bottom')).toEqual({ x: 60, y: 40 })
    })
  })

  describe('CanvasNode', () => {
    it('preserves element dimensions while aligning', () => {
      const position = computeAlignedPosition(boxes[0], computeSelectionBounds(boxes), 'right')
      expect(position.y).toBe(boxes[0].y)
      expect(position.x + boxes[0].width).toBe(130)
    })

    it('distributes nodes horizontally without changing their order', () => {
      const result = computeDistributedPositions(boxes, 'horizontal')
      expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c'])
      expect(result.map((item) => item.x)).toEqual([10, 60, 120])
    })

    it('distributes nodes vertically after sorting by y', () => {
      const result = computeDistributedPositions(boxes, 'vertical')
      expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b'])
      expect(result.map((item) => item.y)).toEqual([10, 35, 40])
    })
  })

  describe('WorkflowCanvasPage', () => {
    it('leaves two-element selections unchanged during distribution', () => {
      expect(computeDistributedPositions(boxes.slice(0, 2), 'horizontal')).toEqual([
        { id: 'a', x: 10, y: 20 },
        { id: 'b', x: 60, y: 40 },
      ])
    })

    it('handles uneven node sizes when distributing', () => {
      const result = computeDistributedPositions([
        { id: 'a', x: 0, y: 0, width: 10, height: 10 },
        { id: 'b', x: 20, y: 0, width: 20, height: 10 },
        { id: 'c', x: 80, y: 0, width: 10, height: 10 },
      ], 'horizontal')
      expect(result.map((item) => item.x)).toEqual([0, 35, 80])
    })

    it('supports vertical alignment independently of horizontal position', () => {
      const bounds = computeSelectionBounds(boxes)
      expect(computeAlignedPosition(boxes[0], bounds, 'bottom')).toEqual({ x: 10, y: 50 })
    })
  })
})

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clearSelection()
    useWorkspaceStore.getState().closeColorPicker()
    useWorkspaceStore.getState().clearPendingRename()
  })

  it('starts with no selection', () => {
    expect(useWorkspaceStore.getState().inspectorMode).toBe('none')
  })

  it('selects a node and opens the node inspector', () => {
    useWorkspaceStore.getState().selectNode('node-1')
    expect(useWorkspaceStore.getState()).toMatchObject({
      selectedProcessId: 'node-1',
      selectedConnectionId: null,
      inspectorMode: 'node',
    })
  })

  it('selects an edge and clears node selection', () => {
    useWorkspaceStore.getState().selectNode('node-1')
    useWorkspaceStore.getState().selectEdge('edge-1')
    expect(useWorkspaceStore.getState()).toMatchObject({
      selectedProcessId: null,
      selectedConnectionId: 'edge-1',
      inspectorMode: 'connection',
    })
  })

  it('supports multi-selection mode', () => {
    useWorkspaceStore.getState().setMultiSelect()
    expect(useWorkspaceStore.getState().inspectorMode).toBe('multi')
  })

  it('tracks canvas tool and connection draft state', () => {
    useWorkspaceStore.getState().setCanvasMode('connect')
    useWorkspaceStore.getState().setConnectionDraft({ fromProcessId: 'a', fromIoId: null, sourceHandle: 'out' })
    expect(useWorkspaceStore.getState()).toMatchObject({
      canvasMode: 'connect',
      pendingConnectionDraft: { fromProcessId: 'a', fromIoId: null, sourceHandle: 'out' },
    })
  })

  it('tracks inline node and edge editing independently', () => {
    useWorkspaceStore.getState().startInlineEdit('node-1')
    useWorkspaceStore.getState().startInlineEditEdge('edge-1')
    expect(useWorkspaceStore.getState()).toMatchObject({
      inlineEditingNodeId: 'node-1',
      inlineEditingEdgeId: 'edge-1',
    })
  })

  it('commits and clears a pending rename', () => {
    useWorkspaceStore.getState().commitRename('node-1', 'Renamed')
    expect(useWorkspaceStore.getState().pendingRename).toEqual({ nodeId: 'node-1', name: 'Renamed' })
    useWorkspaceStore.getState().clearPendingRename()
    expect(useWorkspaceStore.getState().pendingRename).toBeNull()
  })

  it('opens and closes the color picker for a node', () => {
    useWorkspaceStore.getState().openColorPicker('node-1')
    expect(useWorkspaceStore.getState().activeColorPickerNodeId).toBe('node-1')
    useWorkspaceStore.getState().closeColorPicker()
    expect(useWorkspaceStore.getState().activeColorPickerNodeId).toBeNull()
  })
})
