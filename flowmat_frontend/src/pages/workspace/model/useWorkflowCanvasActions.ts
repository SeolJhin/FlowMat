import { useState } from 'react'
import { useCreateProcessConnectionMutation } from '../../../entities/workflow/api/useCreateProcessConnectionMutation'
import { useCreateProcessIoMutation } from '../../../entities/workflow/api/useCreateProcessIoMutation'
import { useCreateProcessMutation } from '../../../entities/workflow/api/useCreateProcessMutation'
import { useDeleteProcessConnectionMutation } from '../../../entities/workflow/api/useDeleteProcessConnectionMutation'
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
  type WorkflowPaletteTool,
} from '../../../entities/workflow/model/nodeCatalog'
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

  async function createNodeAt(position: { x: number; y: number }) {
    if (activeTool === 'select') {
      clearSelection()
      return
    }

    setWorkspaceMessage(null)

    const nextIndex = canvas.nodes.length + 1
    const definition = paletteDefinitions.find((item) => item.tool === activeTool)
    if (!definition) return

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
    updateNode,
    createPort,
    updatePort,
    deletePort,
    saveNodePosition,
    deleteConnection,
    deleteNode,
    createConnection,
  }
}
