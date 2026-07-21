import { useState } from 'react'
import { useCreateProcessConnectionMutation } from '../../../entities/workflow/api/useCreateProcessConnectionMutation'
import { useCreateProcessIoMutation } from '../../../entities/workflow/api/useCreateProcessIoMutation'
import { useCreateProcessMutation } from '../../../entities/workflow/api/useCreateProcessMutation'
import { useDeleteProcessConnectionMutation } from '../../../entities/workflow/api/useDeleteProcessConnectionMutation'
import { useUpdateProcessConnectionMutation } from '../../../entities/workflow/api/useUpdateProcessConnectionMutation'
import { useDeleteProcessIoMutation } from '../../../entities/workflow/api/useDeleteProcessIoMutation'
import { useDeleteProcessMutation } from '../../../entities/workflow/api/useDeleteProcessMutation'
import { useUpdateProcessIoMutation } from '../../../entities/workflow/api/useUpdateProcessIoMutation'
import { useUpdateProcessMutation } from '../../../entities/workflow/api/useUpdateProcessMutation'
import { useCommandHistory } from './commandHistory'
import {
  buildDefaultConnectionPayload,
  getRelatedConnectionIds,
} from '../../../entities/workflow/model/connectionPolicy'
import {
  getWorkflowDefaultNodeDefinition,
  getWorkflowPaletteDefinitions,
  type WorkflowNodeDefinition,
  type WorkflowPaletteTool,
} from '../../../entities/workflow/model/nodeCatalog'
import type { NodePickerState } from './canvasInteractionStore'
import type {
  ConnectCompletePayload,
  CreateProcessIoInput,
  UpdateProcessInput,
  UpdateProcessIoInput,
  WorkflowCanvasViewModel,
} from '../../../entities/workflow/model/types'

interface UseWorkflowCanvasActionsOptions {
  canvas: WorkflowCanvasViewModel
  clearSelection(): void
}

export function useWorkflowCanvasActions({
  canvas,
  clearSelection,
}: UseWorkflowCanvasActionsOptions) {
  const createProcessMutation = useCreateProcessMutation()
  const createProcessIoMutation = useCreateProcessIoMutation()
  const updateProcessIoMutation = useUpdateProcessIoMutation()
  const deleteProcessIoMutation = useDeleteProcessIoMutation()
  const createConnectionMutation = useCreateProcessConnectionMutation()
  const updateConnectionMutation = useUpdateProcessConnectionMutation()
  const deleteConnectionMutation = useDeleteProcessConnectionMutation()
  const deleteProcessMutation = useDeleteProcessMutation()
  const updateProcessMutation = useUpdateProcessMutation()

  const commandHistory = useCommandHistory()

  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<WorkflowPaletteTool>('process')

  const paletteDefinitions = getWorkflowPaletteDefinitions()
  const defaultDefinition = getWorkflowDefaultNodeDefinition()

  async function addNode() {
    setWorkspaceMessage(null)

    const nextIndex = canvas.nodes.length + 1
    const x = 120 + ((nextIndex - 1) % 4) * 220
    const y = 140 + Math.floor((nextIndex - 1) / 4) * 150

    try {
      const created = await createProcessMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        processName: `${defaultDefinition.label} ${nextIndex}`,
        processType: defaultDefinition.processType,
        nodeType: defaultDefinition.nodeType,
        colorScheme: defaultDefinition.colorScheme,
        posX: x,
        posY: y,
        width: defaultDefinition.width,
        height: defaultDefinition.height,
        processDesc: `Created from the canvas toolbar (${nextIndex}).`,
      })
      let currentProcessId = created.processId
      commandHistory.push({
        label: `Create "${created.processName}"`,
        undo: async () => {
          await deleteProcessMutation.mutateAsync(currentProcessId)
        },
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create node.')
    }
  }

  /**
   * Create a node of the given definition at a flow-space position.
   * Returns the created process, or null when creation failed.
   * Shared by click-to-place, drag-to-create, and the on-canvas picker.
   */
  async function createNodeOfDefinition(
    definition: WorkflowNodeDefinition,
    position: { x: number; y: number },
    options?: { pushHistory?: boolean }
  ) {
    setWorkspaceMessage(null)
    const nextIndex = canvas.nodes.length + 1

    try {
      const created = await createProcessMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        processName: `${definition.label} ${nextIndex}`,
        processType: definition.processType,
        nodeType: definition.nodeType,
        colorScheme: definition.colorScheme,
        posX: Math.round(position.x),
        posY: Math.round(position.y),
        width: definition.width,
        height: definition.height,
        processDesc: `Created on canvas at (${Math.round(position.x)}, ${Math.round(position.y)}).`,
      })
      if (options?.pushHistory !== false) {
        const currentProcessId = created.processId
        commandHistory.push({
          label: `Create "${created.processName}"`,
          undo: async () => {
            await deleteProcessMutation.mutateAsync(currentProcessId)
          },
        })
      }
      return created
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create node.')
      return null
    }
  }

  async function createNodeAt(position: { x: number; y: number }) {
    if (activeTool === 'select') {
      clearSelection()
      return
    }

    const definition = paletteDefinitions.find((item) => item.tool === activeTool)
    if (!definition) return

    await createNodeOfDefinition(definition, position)
  }

  /**
   * Drag-to-create (ported from tldraw's useDragToCreate): a palette item
   * dropped on the canvas creates a node centered on the drop position.
   */
  async function createNodeFromTool(
    tool: WorkflowPaletteTool,
    position: { x: number; y: number }
  ) {
    const definition = paletteDefinitions.find((item) => item.tool === tool)
    if (!definition) return

    await createNodeOfDefinition(definition, {
      x: position.x - definition.width / 2,
      y: position.y - definition.height / 2,
    })
  }

  /**
   * On-canvas picker, connect-drop mode (ported from tldraw's
   * OnCanvasComponentPicker): a connection drag dropped on empty canvas
   * creates the picked node and wires it to the dragged handle.
   */
  async function createNodeFromConnectionDrop(
    draft: Extract<NodePickerState, { kind: 'connect-drop' }>['draft'],
    tool: WorkflowPaletteTool,
    position: { x: number; y: number }
  ) {
    const definition = paletteDefinitions.find((item) => item.tool === tool)
    if (!definition) return

    const created = await createNodeOfDefinition(
      definition,
      {
        x: position.x - definition.width / 2,
        y: position.y - definition.height / 2,
      },
      { pushHistory: false }
    )
    if (!created) return

    // Drag started at an output handle → new node is the target, and vice versa.
    const payload: ConnectCompletePayload =
      draft.fromHandleType === 'source'
        ? {
            fromProcessId: draft.fromProcessId,
            toProcessId: created.processId,
            fromIoId: draft.fromHandleId,
            toIoId: null,
            sourceHandle: draft.fromHandleId ?? 'out-default',
            targetHandle: 'in-default',
          }
        : {
            fromProcessId: created.processId,
            toProcessId: draft.fromProcessId,
            fromIoId: null,
            toIoId: draft.fromHandleId,
            sourceHandle: 'out-default',
            targetHandle: draft.fromHandleId ?? 'in-default',
          }

    const connectionInput = buildDefaultConnectionPayload(canvas.workflow.workflowId, payload)
    try {
      const connection = await createConnectionMutation.mutateAsync(connectionInput)
      commandHistory.push({
        label: `Create "${created.processName}" from connection`,
        undo: async () => {
          await deleteConnectionMutation.mutateAsync(connection.connectionId)
          await deleteProcessMutation.mutateAsync(created.processId)
        },
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create connection.')
    }
  }

  /**
   * On-canvas picker, insert-on-edge mode (ported from tldraw's
   * insertNodeWithinConnection): split an existing connection with a new
   * node — original edge is replaced by source→new and new→target.
   */
  async function insertNodeOnEdge(
    edgeId: string,
    tool: WorkflowPaletteTool,
    position: { x: number; y: number }
  ) {
    const edge = canvas.edges.find((e) => e.id === edgeId)
    if (!edge) return

    const definition = paletteDefinitions.find((item) => item.tool === tool)
    if (!definition) return

    const created = await createNodeOfDefinition(
      definition,
      {
        x: position.x - definition.width / 2,
        y: position.y - definition.height / 2,
      },
      { pushHistory: false }
    )
    if (!created) return

    const originalPayload = buildDefaultConnectionPayload(canvas.workflow.workflowId, {
      fromProcessId: edge.fromProcessId,
      toProcessId: edge.toProcessId,
      fromIoId: edge.fromIoId,
      toIoId: edge.toIoId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })

    const upstreamInput = buildDefaultConnectionPayload(canvas.workflow.workflowId, {
      fromProcessId: edge.fromProcessId,
      toProcessId: created.processId,
      fromIoId: edge.fromIoId,
      toIoId: null,
      sourceHandle: edge.sourceHandle,
      targetHandle: 'in-default',
    })
    const downstreamInput = buildDefaultConnectionPayload(canvas.workflow.workflowId, {
      fromProcessId: created.processId,
      toProcessId: edge.toProcessId,
      fromIoId: null,
      toIoId: edge.toIoId,
      sourceHandle: 'out-default',
      targetHandle: edge.targetHandle,
    })

    try {
      await deleteConnectionMutation.mutateAsync(edge.connectionId)
      const upstream = await createConnectionMutation.mutateAsync(upstreamInput)
      const downstream = await createConnectionMutation.mutateAsync(downstreamInput)
      clearSelection()

      commandHistory.push({
        label: `Insert "${created.processName}" into connection`,
        undo: async () => {
          await deleteConnectionMutation.mutateAsync(upstream.connectionId)
          await deleteConnectionMutation.mutateAsync(downstream.connectionId)
          await deleteProcessMutation.mutateAsync(created.processId)
          await createConnectionMutation.mutateAsync(originalPayload)
        },
      })
    } catch (error) {
      setWorkspaceMessage(
        error instanceof Error ? error.message : 'Failed to insert node into connection.'
      )
    }
  }

  async function updateNode(input: UpdateProcessInput) {
    const node = canvas.nodeMap[input.processId]
    setWorkspaceMessage(null)

    try {
      await updateProcessMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to update node.')
      throw error
    }

    if (node) {
      // Capture old values only for fields that were submitted
      const oldInput: UpdateProcessInput = { processId: input.processId }
      if (input.processName !== undefined) oldInput.processName = node.name
      if (input.colorScheme !== undefined) oldInput.colorScheme = node.colorScheme
      if (input.processDesc !== undefined) oldInput.processDesc = node.description ?? undefined
      if (input.processStatus !== undefined) oldInput.processStatus = node.status
      if (input.nodeType !== undefined) oldInput.nodeType = node.nodeType
      if (input.processType !== undefined) oldInput.processType = node.processType
      if (input.posX !== undefined) oldInput.posX = Math.round(node.position.x)
      if (input.posY !== undefined) oldInput.posY = Math.round(node.position.y)
      if (input.width !== undefined) oldInput.width = node.size.width
      if (input.height !== undefined) oldInput.height = node.size.height

      const isPositionOnly = Object.keys(input).filter((k) => k !== 'processId').every(
        (k) => k === 'posX' || k === 'posY'
      )
      const label = isPositionOnly ? `Move "${node.name}"` : `Edit "${node.name}"`

      commandHistory.push({
        label,
        undo: async () => { await updateProcessMutation.mutateAsync(oldInput) },
        redo: async () => { await updateProcessMutation.mutateAsync(input) },
      })
    }
  }

  async function createPort(input: CreateProcessIoInput) {
    setWorkspaceMessage(null)

    try {
      await createProcessIoMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create port.')
      throw error
    }
  }

  async function updatePort(input: UpdateProcessIoInput) {
    setWorkspaceMessage(null)

    try {
      await updateProcessIoMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to update port.')
      throw error
    }
  }

  async function deletePort(processIoId: string) {
    setWorkspaceMessage(null)

    try {
      await deleteProcessIoMutation.mutateAsync(processIoId)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to delete port.')
      throw error
    }
  }

  async function saveNodePosition(processId: string, x: number, y: number) {
    await updateNode({
      processId,
      posX: Math.round(x),
      posY: Math.round(y),
    })
  }

  async function updateConnection(input: import('../../../entities/workflow/model/types').UpdateProcessConnectionInput) {
    setWorkspaceMessage(null)
    const edge = canvas.edges.find((e) => e.id === input.connectionId)

    try {
      await updateConnectionMutation.mutateAsync(input)
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to update connection.')
      throw error
    }

    if (edge) {
      const oldInput: import('../../../entities/workflow/model/types').UpdateProcessConnectionInput = {
        connectionId: input.connectionId,
        ...(input.connectionLabel !== undefined && { connectionLabel: edge.label ?? null }),
        ...(input.connectionType !== undefined && { connectionType: edge.connectionType }),
        ...(input.flowRate !== undefined && { flowRate: edge.flowRate !== null ? Number(edge.flowRate) : null }),
        ...(input.unit !== undefined && { unit: edge.unit }),
        ...(input.delayTimeSec !== undefined && { delayTimeSec: edge.delayTimeSec }),
        ...(input.lossRate !== undefined && { lossRate: edge.lossRate }),
        ...(input.priority !== undefined && { priority: edge.priority }),
      }
      commandHistory.push({
        label: 'Edit connection',
        undo: async () => { await updateConnectionMutation.mutateAsync(oldInput) },
        redo: async () => { await updateConnectionMutation.mutateAsync(input) },
      })
    }
  }

  async function deleteConnection(connectionId: string) {
    setWorkspaceMessage(null)

    const edge = canvas.edges.find((e) => e.id === connectionId)
    try {
      await deleteConnectionMutation.mutateAsync(connectionId)
      clearSelection()
    } catch (error) {
      setWorkspaceMessage(
        error instanceof Error ? error.message : 'Failed to delete connection.'
      )
      return
    }

    if (edge) {
      const restoreInput = buildDefaultConnectionPayload(canvas.workflow.workflowId, {
        fromProcessId: edge.fromProcessId,
        toProcessId: edge.toProcessId,
        fromIoId: edge.fromIoId,
        toIoId: edge.toIoId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
      let currentConnectionId = connectionId
      commandHistory.push({
        label: 'Delete connection',
        undo: async () => {
          const restored = await createConnectionMutation.mutateAsync(restoreInput)
          currentConnectionId = restored.connectionId
        },
        redo: async () => {
          await deleteConnectionMutation.mutateAsync(currentConnectionId)
        },
      })
    }
  }

  async function deleteNode(processId: string) {
    setWorkspaceMessage(null)
    // Node deletion cascades to connections — stale undo commands would reference
    // deleted entities, so clear history to prevent invalid operations.
    commandHistory.clear()

    try {
      const relatedConnectionIds = getRelatedConnectionIds(canvas.edges, processId)

      for (const connectionId of relatedConnectionIds) {
        await deleteConnectionMutation.mutateAsync(connectionId)
      }

      await deleteProcessMutation.mutateAsync(processId)
      clearSelection()
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to delete node.')
    }
  }

  async function createConnection(payload: ConnectCompletePayload) {
    setWorkspaceMessage(null)

    const connectionInput = buildDefaultConnectionPayload(canvas.workflow.workflowId, payload)
    try {
      const created = await createConnectionMutation.mutateAsync(connectionInput)
      let currentConnectionId = created.connectionId
      commandHistory.push({
        label: 'Add connection',
        undo: async () => {
          await deleteConnectionMutation.mutateAsync(currentConnectionId)
        },
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create connection.')
    }
  }

  return {
    activeTool,
    setActiveTool,
    workspaceMessage,
    paletteDefinitions,
    commandHistory,
    addNode,
    createNodeAt,
    createNodeFromTool,
    createNodeFromConnectionDrop,
    insertNodeOnEdge,
    updateNode,
    createPort,
    updatePort,
    deletePort,
    saveNodePosition,
    updateConnection,
    deleteConnection,
    deleteNode,
    createConnection,
  }
}
